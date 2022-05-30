/*:
 * @target MZ
 * @command Test
 * @text Set Text Picture
 */
(() => {
    const pluginName = "Test";

    const SpriteGaugeHeight = 32;

    function Sprite_GaugePlus() {
        this.initialize(...arguments);
    }
    
    Sprite_GaugePlus.prototype = Object.create(Sprite_Gauge.prototype);
    Sprite_GaugePlus.prototype.constructor = Sprite_GaugePlus;

    Sprite_GaugePlus.prototype.currentValue = function() {
        if (this._battler) {
            switch (this._statusType) {
                case "hp":
                    return this._battler.hp;
                case "mp":
                    return this._battler.mp;
                case "tp":
                    return this._battler.tp;
                case "time":
                    return this._battler.tpbChargeTime();
                case "exp":
                    if (this._battler.currentExp != null){
                        return this._battler.currentExp();
                    }
            }
        }
        return NaN;
    };

    Sprite_GaugePlus.prototype.currentMaxValue = function() {
        if (this._battler) {
            switch (this._statusType) {
                case "hp":
                    return this._battler.mhp;
                case "mp":
                    return this._battler.mmp;
                case "tp":
                    return this._battler.maxTp();
                case "time":
                    return 1;
                case "exp":
                    if (this._battler.currentExp != null){
                        return this._battler.nextLevelExp();
                    }
            }
        }
        return NaN;
    };

    Sprite_GaugePlus.prototype.label = function() {
        switch (this._statusType) {
            case "hp":
                return TextManager.hpA;
            case "mp":
                return TextManager.mpA;
            case "tp":
                return TextManager.tpA;
            case "exp":
                return TextManager.exp;
            default:
                return "";
        }
    };

    const TextOffset = 3;
    const TextHeight = 24;
    const TextBitmapWidth = 128;

    function Sprite_Text() {
        this.initialize(...arguments);
    }
    
    Sprite_Text.prototype = Object.create(Sprite.prototype);
    Sprite_Text.prototype.constructor = Sprite_Text;

    Sprite_Text.prototype.initialize = function(Text, OffsetX, OffsetY, MaxWidth, LineHeight, Align) {
        Sprite.prototype.initialize.call(this);
        this._Text = Text || "";
        this._OffsetX = OffsetX || TextOffset;
        this._OffsetY = OffsetY || TextOffset;
        this._LineHeight = LineHeight || TextHeight;
        this._MaxWidth = MaxWidth || TextBitmapWidth;
        this._Align = Align || "left";
        this.bitmap = new Bitmap(this._MaxWidth + 2 * this._OffsetX, this._LineHeight + 2 * this._OffsetY);
        this.DrawText();
    };

    Sprite_Text.prototype.DrawText = function(){
        if (this.bitmap === null){
            return
        }
        this.bitmap.clear();
        this.bitmap.drawText(this._Text, this._OffsetX, this._OffsetY, this._MaxWidth, this._LineHeight, this._Align);
    }

    Sprite_Text.prototype.SetText = function(Text){
        this._Text = Text || "";
        this.DrawText();
    }

    SceneManager.GetScene = function() {
        return this._scene;
    };

    SceneManager.IsScene = function(SceneClass) {
        return this._scene && this._scene.constructor === SceneClass;
    };

    let InfoWindowLayer;
    let ExpGauge;
    let GoldText;

    function UpdateGoldText(Gold)
    {
        if (GoldText === null)
        {
            return
        }
        GoldText.SetText(Gold + TextManager.currencyUnit);
    }

    let Scene_Map_CreateDisplayObjects = Scene_Map.prototype.createDisplayObjects
    Scene_Map.prototype.createDisplayObjects = function (){
        Scene_Map_CreateDisplayObjects.call(this);

        InfoWindowLayer = new WindowLayer()
        let Scene = SceneManager.GetScene();
        Scene.addWindow(InfoWindowLayer);

        let Leader = $gameParty.leader();

        ExpGauge = new Sprite_GaugePlus();
        ExpGauge.setup(Leader, "exp");
        ExpGauge.move(0, 0);
        ExpGauge.show();
        InfoWindowLayer.addChild(ExpGauge);
        
        GoldText = new Sprite_Text("fsdf");
        GoldText.move(0, SpriteGaugeHeight);
        UpdateGoldText($gameParty.gold());
        InfoWindowLayer.addChild(GoldText);
    }

    let Game_Party_GainGold = Game_Party.prototype.gainGold;
    Game_Party.prototype.gainGold = function(amount) {
        let OldGold = this.gold();
        Game_Party_GainGold.call(this, amount);
        let NewGold = this.gold();
        UpdateGoldText(NewGold);
    }

    function Game_Looper() {
        this.initialize(...arguments);
    }
    
    Game_Looper.prototype.initialize = function (Frame, Func, Self) {
        this._Frame = Frame;
        this._FrameCount = 0;
        this._Func = Func;
        this._Self = Self;
    }

    Game_Looper.prototype.Update = function () {
        if (++this._FrameCount >= this._Frame)
        {
            this._FrameCount = 0;
            this._Func.call(this._Self);
        }
    }

    let AutoGainExpFrame = 60;
    let AutoGainExp = 10;
    let AutoGainExpLooper = new Game_Looper(AutoGainExpFrame,function(){
        $gameParty.leader().gainExp(AutoGainExp);
    });

    let AutoGainGoldFrame = 10;
    let AutoGainGold = 1;
    let AutoGainGoldLooper = new Game_Looper(AutoGainGoldFrame,function(){
        let Leader = $gameParty.leader();
        $gameParty.gainGold(Leader.level * AutoGainGold);
    });

    let Scene_Map_UpdateMain = Scene_Map.prototype.updateMain;
    Scene_Map.prototype.updateMain = function (){
        Scene_Map_UpdateMain.call(this);
        //AutoGainExpLooper.Update();
        AutoGainGoldLooper.Update();
    }

    const ImmediateUseItemID　= 100; 
    const ImmediateUseItemMaxNum　= 1; 

    let Game_Party_GainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function(item, amount, includeEquip){
        Game_Party_GainItem.call(this, item, amount, includeEquip);
        let NumItems = this.numItems(item);
        if (DataManager.isItem(item) && item.id >= ImmediateUseItemID　 && NumItems > 0) {
            this.loseItem(item, NumItems);
            let Leader = $gameParty.leader()
            const action = new Game_Action(Leader);
            action.setItemObject(item);
            for (let i = 0; i < NumItems; i++){
                action.applyGlobal();
            }
            if (SceneManager.IsScene(Scene_Shop))
            {
                SceneManager.GetScene().popScene();
            }
        }    
    }

    let Game_Party_MaxItems = Game_Party.prototype.maxItems;
    Game_Party.prototype.maxItems = function(item) {
        let MaxItems = Game_Party_MaxItems.call(this, item);
        if (item.id >= ImmediateUseItemID){
            MaxItems = ImmediateUseItemMaxNum;
        }
        return MaxItems;
    };

    let Window_ShopBuy_Price = Window_ShopBuy.prototype.price;
    Window_ShopBuy.prototype.price = function(item){
        let Price = Window_ShopBuy_Price.call(this, item)
        if (item.id >= ImmediateUseItemID){
            let Leader = $gameParty.leader()
            Price = Leader.level * 100;
        }
        return Price;
    }

    Scene_Shop.prototype.GetBuyWindow = function() {
        return this._buyWindow;
    };

    function OnLeaderLevelChange(OldLevel, NewLevel){
    }

    let Game_Actor_LevelUp = Game_Actor.prototype.levelUp;
    Game_Actor.prototype.levelUp = function() {
        let OldLevel = this.level;
        Game_Actor_LevelUp.call(this);
        let NewLevel = this.level;
        if (this === $gameParty.leader()){
            OnLeaderLevelChange(OldLevel, NewLevel);
        }
    };
    
    let Game_Actor_LevelDown = Game_Actor.prototype.levelDown;
    Game_Actor.prototype.levelDown = function() {
        let OldLevel = this.level;
        Game_Actor_LevelDown.call(this);
        let NewLevel = this.level;
        if (this === $gameParty.leader()){
            OnLeaderLevelChange(OldLevel, NewLevel);
        }
    };

    PluginManager.registerCommand(pluginName, "Test", args => {
    });
})();

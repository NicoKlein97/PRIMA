"use strict";
///<reference types="../FUDGE/Build/FudgeCore.js"/> 
var L16_ScrollerCollide;
///<reference types="../FUDGE/Build/FudgeCore.js"/> 
(function (L16_ScrollerCollide) {
    var fudge = FudgeCore;
    class Stone extends fudge.Node {
        constructor(_name, _x, _y, _direction, _lvl) {
            super(_name);
            this.lifetime = 100;
            this.counter = 0;
            this.update = (_event) => {
                this.counter = this.counter + 1;
                this.broadcastEvent(new CustomEvent("showNext"));
                if (this.direction == "right") {
                    this.cmpTransform.local.translateX(0.1);
                }
                else {
                    this.cmpTransform.local.translateX(-0.1);
                }
                if (this.counter > this.lifetime) {
                    this.deleteThis();
                }
                if (this.direction == "right") {
                    this.hitbox.cmpTransform.local.translation = new fudge.Vector3(this.mtxWorld.translation.x + 0.1, this.mtxWorld.translation.y + 0.3, 0);
                }
                else if (this.direction == "left") {
                    this.hitbox.cmpTransform.local.translation = new fudge.Vector3(this.mtxWorld.translation.x - 0.1, this.mtxWorld.translation.y + 0.3, 0);
                }
            };
            this.level = _lvl;
            this.addComponent(new fudge.ComponentTransform());
            for (let sprite of Stone.sprites) {
                let nodeSprite = new L16_ScrollerCollide.NodeSprite(sprite.name, sprite);
                nodeSprite.activate(true);
                nodeSprite.addEventListener("showNext", (_event) => { _event.currentTarget.showFrameNext(); }, true);
                this.appendChild(nodeSprite);
            }
            this.cmpTransform.local.translation = new fudge.Vector3(_x, _y, 0);
            this.cmpTransform.local.scale(new fudge.Vector3(0.6, 0.6, 0));
            this.direction = _direction;
            this.creatHitbox();
            fudge.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.update);
        }
        static generateSprites(_txtImage) {
            Stone.sprites = [];
            let sprite = new L16_ScrollerCollide.Sprite(L16_ScrollerCollide.ACTION.IDLE);
            sprite.generateByGrid(_txtImage, fudge.Rectangle.GET(15, 170, 36, 38), 7, fudge.Vector2.ZERO(), 64, fudge.ORIGIN2D.BOTTOMCENTER);
            Stone.sprites.push(sprite);
        }
        creatHitbox() {
            let hitbox = new L16_ScrollerCollide.Hitbox(this, "StoneHitbox");
            hitbox.cmpTransform.local.scaleX(0.25);
            hitbox.cmpTransform.local.scaleY(0.25);
            this.hitbox = hitbox;
            return hitbox;
        }
        show(_action) {
            for (let child of this.getChildren()) {
                child.activate(child.name == _action);
            }
        }
        act(_action) {
            this.show(_action);
        }
        deleteThis() {
            this.level.removeChild(this.hitbox);
            this.level.removeChild(this);
        }
    }
    L16_ScrollerCollide.Stone = Stone;
})(L16_ScrollerCollide || (L16_ScrollerCollide = {}));
//# sourceMappingURL=Stone.js.map
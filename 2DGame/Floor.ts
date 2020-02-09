///<reference types="../FUDGE/Build/FudgeCore.js"/> 
namespace L16_ScrollerCollide {
    import fudge = FudgeCore;

    export enum TYPE {
      GRASS = "Grass",
      DIRT = "Dirt"
    }
  
    export class Floor extends fudge.Node {
      private static sprites: Sprite[];
      private static mesh: fudge.MeshSprite = new fudge.MeshSprite();
      private static material: fudge.Material = new fudge.Material("Floor", fudge.ShaderUniColor, new fudge.CoatColored(fudge.Color.CSS("red", 0.5)));
      private static readonly pivot: fudge.Matrix4x4 = fudge.Matrix4x4.TRANSLATION(fudge.Vector3.Y(-0.5));
  
      public constructor(_type: TYPE) {
        super("Floor");
        if (_type == "Grass") {
          let nodeSprite: NodeSprite = new NodeSprite("GrassFloor", Floor.sprites[0]);
          nodeSprite.activate(true);
          this.appendChild(nodeSprite);
        }else if(_type == "Dirt") {
          let nodeSprite: NodeSprite = new NodeSprite("DirtFloor", Floor.sprites[1]);
          nodeSprite.activate(true);
          this.appendChild(nodeSprite);
        }
        this.addComponent(new fudge.ComponentTransform());
        //this.addComponent(new fudge.ComponentMaterial(Floor.material));
        let cmpMesh: fudge.ComponentMesh = new fudge.ComponentMesh(Floor.mesh);
        //cmpMesh.pivot.translateY(-0.5);
        cmpMesh.pivot = Floor.pivot;
        this.addComponent(cmpMesh);
      }

      public static generateSprites(_txtImage: fudge.TextureImage): void {
        Floor.sprites = [];
        let sprite: Sprite = new Sprite("GrassFloor");
        sprite.generateByGrid(_txtImage, fudge.Rectangle.GET(2, 24, 188, 220), 1, fudge.Vector2.ZERO(), 160, fudge.ORIGIN2D.CENTER);
        for (let i = 0; i < sprite.frames.length; i++) {
          sprite.frames[i].pivot.translateX(-0.1);
          sprite.frames[i].pivot.translateY(-0.5);
        }
        Floor.sprites.push(sprite);

        sprite = new Sprite("DirtFloor");
        sprite.generateByGrid(_txtImage, fudge.Rectangle.GET(300, 24, 340, 300), 1, fudge.Vector2.ZERO(), 250, fudge.ORIGIN2D.CENTER);
        for (let i = 0; i < sprite.frames.length; i++) {
          sprite.frames[i].pivot.translateX(-0.17);
          sprite.frames[i].pivot.translateY(-0.6);
        }
        Floor.sprites.push(sprite);
      }

      public show(): void {
        for (let child of this.getChildren())
          child.activate(child.name == "Floor");
      }
  
      public getRectWorld(): fudge.Rectangle {
        let rect: fudge.Rectangle = fudge.Rectangle.GET(0, 0, 100, 100);
        let topleft: fudge.Vector3 = new fudge.Vector3(-0.5, 0.5, 0);
        let bottomright: fudge.Vector3 = new fudge.Vector3(0.5, -0.5, 0);
        
        //let pivot: fudge.Matrix4x4 = this.getComponent(fudge.ComponentMesh).pivot;
        let mtxResult: fudge.Matrix4x4 = fudge.Matrix4x4.MULTIPLICATION(this.mtxWorld, Floor.pivot);
        topleft.transform(mtxResult, true);
        bottomright.transform(mtxResult, true);
  
        let size: fudge.Vector2 = new fudge.Vector2(bottomright.x - topleft.x, bottomright.y - topleft.y);
        rect.position = topleft.toVector2();
        rect.size = size;
  
        return rect;
      }
    }
  }
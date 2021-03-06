///<reference types="../FUDGE/Build/FudgeCore.js"/> 
namespace L16_ScrollerCollide {
    interface Sounds {
        [id: string]: HTMLAudioElement;
      }
    export class Sound {
    public static volMusic: number = 0.3;
    public static volEffects: number = 0.1;
    public static volEnvironment: number = 0.1;
    public static volVoices: number = 0.3;
    private static sounds: Sounds = {};

    public static init(): void {
        let audioElements: NodeListOf<HTMLAudioElement> = document.querySelectorAll("audio");
        for (let element of audioElements) {
            Sound.sounds[element.id] = element;
        }
    }

    public static play(_id: string): void {

        if (Sound.sounds[_id].id == "WalkOnGrass" || Sound.sounds[_id].id == "Sword" || Sound.sounds[_id].id == "Slurp") {
            Sound.sounds[_id].volume = Sound.volEffects;
        } else if (Sound.sounds[_id].id == "Theme") {
            Sound.sounds[_id].volume = Sound.volMusic;
        } else if (Sound.sounds[_id].id == "Wind") {
            Sound.sounds[_id].volume = Sound.volEnvironment;
        } else if (Sound.sounds[_id].id == "HitHuman" || Sound.sounds[_id].id == "HurtMonsterSmall" || Sound.sounds[_id].id == "HurtMonsterBig") {
            Sound.sounds[_id].volume = Sound.volVoices;
        }
        Sound.sounds[_id].play();
    }


    }
}
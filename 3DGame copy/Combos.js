"use strict";
///<reference types="../FUDGE/Build/FudgeCore.js"/>
var FudgeCraftCopy;
///<reference types="../FUDGE/Build/FudgeCore.js"/>
(function (FudgeCraftCopy) {
    class Combos {
        constructor(_elements) {
            this.found = [];
            this.detect(_elements);
        }
        detect(_elements) {
            for (let element of _elements) {
                if (this.contains(element))
                    continue;
                let combo = [];
                combo.push(element);
                this.recurse(element, combo);
                this.found.push(combo);
            }
        }
        contains(_element) {
            for (let combo of this.found)
                for (let element of combo)
                    if (element == _element)
                        return true;
            return false;
        }
        recurse(_element, _combo) {
            let matches = this.findNeigborsOfSameColor(_element);
            for (let iMatch = matches.length - 1; iMatch >= 0; iMatch--) {
                let match = matches[iMatch];
                let iCombo = _combo.indexOf(match);
                if (iCombo >= 0)
                    matches.splice(iMatch, 1);
                else
                    _combo.push(match);
            }
            for (let match of matches)
                this.recurse(match, _combo);
        }
        findNeigborsOfSameColor(_element) {
            let allNeighbors = FudgeCraftCopy.grid.findNeighbors(_element.position);
            let found = allNeighbors.filter(_neighbor => (_neighbor.cube.name == _element.cube.name));
            return found;
        }
    }
    FudgeCraftCopy.Combos = Combos;
})(FudgeCraftCopy || (FudgeCraftCopy = {}));
//# sourceMappingURL=Combos.js.map
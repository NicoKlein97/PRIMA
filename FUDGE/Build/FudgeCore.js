"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FudgeCore;
(function (FudgeCore) {
    /**
     * Handles the external serialization and deserialization of [[Serializable]] objects. The internal process is handled by the objects themselves.
     * A [[Serialization]] object can be created from a [[Serializable]] object and a JSON-String may be created from that.
     * Vice versa, a JSON-String can be parsed to a [[Serialization]] which can be deserialized to a [[Serializable]] object.
     * ```plaintext
     *  [Serializable] → (serialize) → [Serialization] → (stringify)
     *                                                        ↓
     *                                                    [String]
     *                                                        ↓
     *  [Serializable] ← (deserialize) ← [Serialization] ← (parse)
     * ```
     * While the internal serialize/deserialize methods of the objects care of the selection of information needed to recreate the object and its structure,
     * the [[Serializer]] keeps track of the namespaces and classes in order to recreate [[Serializable]] objects. The general structure of a [[Serialization]] is as follows
     * ```plaintext
     * {
     *      namespaceName.className: {
     *          propertyName: propertyValue,
     *          ...,
     *          propertyNameOfReference: SerializationOfTheReferencedObject,
     *          ...,
     *          constructorNameOfSuperclass: SerializationOfSuperClass
     *      }
     * }
     * ```
     * Since the instance of the superclass is created automatically when an object is created,
     * the SerializationOfSuperClass omits the the namespaceName.className key and consists only of its value.
     * The constructorNameOfSuperclass is given instead as a property name in the serialization of the subclass.
     */
    class Serializer {
        /**
         * Registers a namespace to the [[Serializer]], to enable automatic instantiation of classes defined within
         * @param _namespace
         */
        static registerNamespace(_namespace) {
            for (let name in Serializer.namespaces)
                if (Serializer.namespaces[name] == _namespace)
                    return;
            let name = Serializer.findNamespaceIn(_namespace, window);
            if (!name)
                for (let parentName in Serializer.namespaces) {
                    name = Serializer.findNamespaceIn(_namespace, Serializer.namespaces[parentName]);
                    if (name) {
                        name = parentName + "." + name;
                        break;
                    }
                }
            if (!name)
                throw new Error("Namespace not found. Maybe parent namespace hasn't been registered before?");
            Serializer.namespaces[name] = _namespace;
        }
        /**
         * Returns a javascript object representing the serializable FUDGE-object given,
         * including attached components, children, superclass-objects all information needed for reconstruction
         * @param _object An object to serialize, implementing the [[Serializable]] interface
         */
        static serialize(_object) {
            let serialization = {};
            // TODO: save the namespace with the constructors name
            // serialization[_object.constructor.name] = _object.serialize();
            let path = this.getFullPath(_object);
            if (!path)
                throw new Error(`Namespace of serializable object of type ${_object.constructor.name} not found. Maybe the namespace hasn't been registered or the class not exported?`);
            serialization[path] = _object.serialize();
            return serialization;
            // return _object.serialize();
        }
        /**
         * Returns a FUDGE-object reconstructed from the information in the [[Serialization]] given,
         * including attached components, children, superclass-objects
         * @param _serialization
         */
        static deserialize(_serialization) {
            let reconstruct;
            try {
                // loop constructed solely to access type-property. Only one expected!
                for (let path in _serialization) {
                    // reconstruct = new (<General>Fudge)[typeName];
                    reconstruct = Serializer.reconstruct(path);
                    reconstruct.deserialize(_serialization[path]);
                    return reconstruct;
                }
            }
            catch (_error) {
                throw new Error("Deserialization failed: " + _error);
            }
            return null;
        }
        //TODO: implement prettifier to make JSON-Stringification of serializations more readable, e.g. placing x, y and z in one line
        static prettify(_json) { return _json; }
        /**
         * Returns a formatted, human readable JSON-String, representing the given [[Serializaion]] that may have been created by [[Serializer]].serialize
         * @param _serialization
         */
        static stringify(_serialization) {
            // adjustments to serialization can be made here before stringification, if desired
            let json = JSON.stringify(_serialization, null, 2);
            let pretty = Serializer.prettify(json);
            return pretty;
        }
        /**
         * Returns a [[Serialization]] created from the given JSON-String. Result may be passed to [[Serializer]].deserialize
         * @param _json
         */
        static parse(_json) {
            return JSON.parse(_json);
        }
        /**
         * Creates an object of the class defined with the full path including the namespaceName(s) and the className seperated by dots(.)
         * @param _path
         */
        static reconstruct(_path) {
            let typeName = _path.substr(_path.lastIndexOf(".") + 1);
            let namespace = Serializer.getNamespace(_path);
            if (!namespace)
                throw new Error(`Namespace of serializable object of type ${typeName} not found. Maybe the namespace hasn't been registered?`);
            let reconstruction = new namespace[typeName];
            return reconstruction;
        }
        /**
         * Returns the full path to the class of the object, if found in the registered namespaces
         * @param _object
         */
        static getFullPath(_object) {
            let typeName = _object.constructor.name;
            // Debug.log("Searching namespace of: " + typeName);
            for (let namespaceName in Serializer.namespaces) {
                let found = Serializer.namespaces[namespaceName][typeName];
                if (found && _object instanceof found)
                    return namespaceName + "." + typeName;
            }
            return null;
        }
        /**
         * Returns the namespace-object defined within the full path, if registered
         * @param _path
         */
        static getNamespace(_path) {
            let namespaceName = _path.substr(0, _path.lastIndexOf("."));
            return Serializer.namespaces[namespaceName];
        }
        /**
         * Finds the namespace-object in properties of the parent-object (e.g. window), if present
         * @param _namespace
         * @param _parent
         */
        static findNamespaceIn(_namespace, _parent) {
            for (let prop in _parent)
                if (_parent[prop] == _namespace)
                    return prop;
            return null;
        }
    }
    /** In order for the Serializer to create class instances, it needs access to the appropriate namespaces */
    Serializer.namespaces = { "ƒ": FudgeCore };
    FudgeCore.Serializer = Serializer;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class PointerEventƒ extends PointerEvent {
        constructor(type, _event) {
            super(type, _event);
            let target = _event.target;
            this.clientRect = target.getClientRects()[0];
            this.pointerX = _event.clientX - this.clientRect.left;
            this.pointerY = _event.clientY - this.clientRect.top;
        }
    }
    FudgeCore.PointerEventƒ = PointerEventƒ;
    class DragDropEventƒ extends DragEvent {
        constructor(type, _event) {
            super(type, _event);
            let target = _event.target;
            this.clientRect = target.getClientRects()[0];
            this.pointerX = _event.clientX - this.clientRect.left;
            this.pointerY = _event.clientY - this.clientRect.top;
        }
    }
    FudgeCore.DragDropEventƒ = DragDropEventƒ;
    class WheelEventƒ extends WheelEvent {
        constructor(type, _event) {
            super(type, _event);
        }
    }
    FudgeCore.WheelEventƒ = WheelEventƒ;
    class EventTargetƒ extends EventTarget {
        addEventListener(_type, _handler, _options) {
            super.addEventListener(_type, _handler, _options);
        }
        removeEventListener(_type, _handler, _options) {
            super.removeEventListener(_type, _handler, _options);
        }
        dispatchEvent(_event) {
            return super.dispatchEvent(_event);
        }
    }
    FudgeCore.EventTargetƒ = EventTargetƒ;
    /**
     * Base class for EventTarget singletons, which are fixed entities in the structure of Fudge, such as the core loop
     */
    class EventTargetStatic extends EventTargetƒ {
        constructor() {
            super();
        }
        static addEventListener(_type, _handler) {
            EventTargetStatic.targetStatic.addEventListener(_type, _handler);
        }
        static removeEventListener(_type, _handler) {
            EventTargetStatic.targetStatic.removeEventListener(_type, _handler);
        }
        static dispatchEvent(_event) {
            EventTargetStatic.targetStatic.dispatchEvent(_event);
            return true;
        }
    }
    EventTargetStatic.targetStatic = new EventTargetStatic();
    FudgeCore.EventTargetStatic = EventTargetStatic;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Event/Event.ts"/>
var FudgeCore;
/// <reference path="../Event/Event.ts"/>
(function (FudgeCore) {
    /**
     * Base class for all types being mutable using [[Mutator]]-objects, thus providing and using interfaces created at runtime.
     * Mutables provide a [[Mutator]] that is build by collecting all object-properties that are either of a primitive type or again Mutable.
     * Subclasses can either reduce the standard [[Mutator]] built by this base class by deleting properties or implement an individual getMutator-method.
     * The provided properties of the [[Mutator]] must match public properties or getters/setters of the object.
     * Otherwise, they will be ignored if not handled by an override of the mutate-method in the subclass and throw errors in an automatically generated user-interface for the object.
     */
    class Mutable extends FudgeCore.EventTargetƒ {
        /**
         * Retrieves the type of this mutable subclass as the name of the runtime class
         * @returns The type of the mutable
         */
        get type() {
            return this.constructor.name;
        }
        /**
         * Collect applicable attributes of the instance and copies of their values in a Mutator-object
         */
        getMutator() {
            let mutator = {};
            // collect primitive and mutable attributes
            for (let attribute in this) {
                let value = this[attribute];
                if (value instanceof Function)
                    continue;
                if (value instanceof Object && !(value instanceof Mutable))
                    continue;
                mutator[attribute] = this[attribute];
            }
            // mutator can be reduced but not extended!
            Object.preventExtensions(mutator);
            // delete unwanted attributes
            this.reduceMutator(mutator);
            // replace references to mutable objects with references to copies
            for (let attribute in mutator) {
                let value = mutator[attribute];
                if (value instanceof Mutable)
                    mutator[attribute] = value.getMutator();
            }
            return mutator;
        }
        /**
         * Collect the attributes of the instance and their values applicable for animation.
         * Basic functionality is identical to [[getMutator]], returned mutator should then be reduced by the subclassed instance
         */
        getMutatorForAnimation() {
            return this.getMutator();
        }
        /**
         * Collect the attributes of the instance and their values applicable for the user interface.
         * Basic functionality is identical to [[getMutator]], returned mutator should then be reduced by the subclassed instance
         */
        getMutatorForUserInterface() {
            return this.getMutator();
        }
        /**
         * Returns an associative array with the same attributes as the given mutator, but with the corresponding types as string-values
         * Does not recurse into objects!
         * @param _mutator
         */
        getMutatorAttributeTypes(_mutator) {
            let types = {};
            for (let attribute in _mutator) {
                let type = null;
                let value = _mutator[attribute];
                if (_mutator[attribute] != undefined)
                    if (typeof (value) == "object")
                        type = this[attribute].constructor.name;
                    else
                        type = _mutator[attribute].constructor.name;
                types[attribute] = type;
            }
            return types;
        }
        /**
         * Updates the values of the given mutator according to the current state of the instance
         * @param _mutator
         */
        updateMutator(_mutator) {
            for (let attribute in _mutator) {
                let value = _mutator[attribute];
                if (value instanceof Mutable)
                    value = value.getMutator();
                else
                    _mutator[attribute] = this[attribute];
            }
        }
        /**
         * Updates the attribute values of the instance according to the state of the mutator. Must be protected...!
         * @param _mutator
         */
        mutate(_mutator) {
            // TODO: don't assign unknown properties
            for (let attribute in _mutator) {
                let value = _mutator[attribute];
                let mutant = this[attribute];
                if (mutant instanceof Mutable)
                    mutant.mutate(value);
                else
                    this[attribute] = value;
            }
            this.dispatchEvent(new Event("mutate" /* MUTATE */));
        }
    }
    FudgeCore.Mutable = Mutable;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * Internally used to differentiate between the various generated structures and events.
     * @author Lukas Scheuerle, HFU, 2019
     */
    let ANIMATION_STRUCTURE_TYPE;
    (function (ANIMATION_STRUCTURE_TYPE) {
        /**Default: forward, continous */
        ANIMATION_STRUCTURE_TYPE[ANIMATION_STRUCTURE_TYPE["NORMAL"] = 0] = "NORMAL";
        /**backward, continous */
        ANIMATION_STRUCTURE_TYPE[ANIMATION_STRUCTURE_TYPE["REVERSE"] = 1] = "REVERSE";
        /**forward, rastered */
        ANIMATION_STRUCTURE_TYPE[ANIMATION_STRUCTURE_TYPE["RASTERED"] = 2] = "RASTERED";
        /**backward, rastered */
        ANIMATION_STRUCTURE_TYPE[ANIMATION_STRUCTURE_TYPE["RASTEREDREVERSE"] = 3] = "RASTEREDREVERSE";
    })(ANIMATION_STRUCTURE_TYPE || (ANIMATION_STRUCTURE_TYPE = {}));
    /**
     * Animation Class to hold all required Objects that are part of an Animation.
     * Also holds functions to play said Animation.
     * Can be added to a Node and played through [[ComponentAnimator]].
     * @author Lukas Scheuerle, HFU, 2019
     */
    class Animation extends FudgeCore.Mutable {
        constructor(_name, _animStructure = {}, _fps = 60) {
            super();
            this.totalTime = 0;
            this.labels = {};
            this.stepsPerSecond = 10;
            this.events = {};
            this.framesPerSecond = 60;
            // processed eventlist and animation strucutres for playback.
            this.eventsProcessed = new Map();
            this.animationStructuresProcessed = new Map();
            this.name = _name;
            this.animationStructure = _animStructure;
            this.animationStructuresProcessed.set(ANIMATION_STRUCTURE_TYPE.NORMAL, _animStructure);
            this.framesPerSecond = _fps;
            this.calculateTotalTime();
        }
        /**
         * Generates a new "Mutator" with the information to apply to the [[Node]] the [[ComponentAnimator]] is attached to with [[Node.applyAnimation()]].
         * @param _time The time at which the animation currently is at
         * @param _direction The direction in which the animation is supposed to be playing back. >0 == forward, 0 == stop, <0 == backwards
         * @param _playback The playbackmode the animation is supposed to be calculated with.
         * @returns a "Mutator" to apply.
         */
        getMutated(_time, _direction, _playback) {
            let m = {};
            if (_playback == FudgeCore.ANIMATION_PLAYBACK.TIMEBASED_CONTINOUS) {
                if (_direction >= 0) {
                    m = this.traverseStructureForMutator(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.NORMAL), _time);
                }
                else {
                    m = this.traverseStructureForMutator(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.REVERSE), _time);
                }
            }
            else {
                if (_direction >= 0) {
                    m = this.traverseStructureForMutator(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.RASTERED), _time);
                }
                else {
                    m = this.traverseStructureForMutator(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.RASTEREDREVERSE), _time);
                }
            }
            return m;
        }
        /**
         * Returns a list of the names of the events the [[ComponentAnimator]] needs to fire between _min and _max.
         * @param _min The minimum time (inclusive) to check between
         * @param _max The maximum time (exclusive) to check between
         * @param _playback The playback mode to check in. Has an effect on when the Events are fired.
         * @param _direction The direction the animation is supposed to run in. >0 == forward, 0 == stop, <0 == backwards
         * @returns a list of strings with the names of the custom events to fire.
         */
        getEventsToFire(_min, _max, _playback, _direction) {
            let eventList = [];
            let minSection = Math.floor(_min / this.totalTime);
            let maxSection = Math.floor(_max / this.totalTime);
            _min = _min % this.totalTime;
            _max = _max % this.totalTime;
            while (minSection <= maxSection) {
                let eventTriggers = this.getCorrectEventList(_direction, _playback);
                if (minSection == maxSection) {
                    eventList = eventList.concat(this.checkEventsBetween(eventTriggers, _min, _max));
                }
                else {
                    eventList = eventList.concat(this.checkEventsBetween(eventTriggers, _min, this.totalTime));
                    _min = 0;
                }
                minSection++;
            }
            return eventList;
        }
        /**
         * Adds an Event to the List of events.
         * @param _name The name of the event (needs to be unique per Animation).
         * @param _time The timestamp of the event (in milliseconds).
         */
        setEvent(_name, _time) {
            this.events[_name] = _time;
            this.eventsProcessed.clear();
        }
        /**
         * Removes the event with the given name from the list of events.
         * @param _name name of the event to remove.
         */
        removeEvent(_name) {
            delete this.events[_name];
            this.eventsProcessed.clear();
        }
        get getLabels() {
            //TODO: this actually needs testing
            let en = new Enumerator(this.labels);
            return en;
        }
        get fps() {
            return this.framesPerSecond;
        }
        set fps(_fps) {
            this.framesPerSecond = _fps;
            this.eventsProcessed.clear();
            this.animationStructuresProcessed.clear();
        }
        /**
         * (Re-)Calculate the total time of the Animation. Calculation-heavy, use only if actually needed.
         */
        calculateTotalTime() {
            this.totalTime = 0;
            this.traverseStructureForTime(this.animationStructure);
        }
        //#region transfer
        serialize() {
            let s = {
                idResource: this.idResource,
                name: this.name,
                labels: {},
                events: {},
                fps: this.framesPerSecond,
                sps: this.stepsPerSecond
            };
            for (let name in this.labels) {
                s.labels[name] = this.labels[name];
            }
            for (let name in this.events) {
                s.events[name] = this.events[name];
            }
            s.animationStructure = this.traverseStructureForSerialisation(this.animationStructure);
            return s;
        }
        deserialize(_serialization) {
            this.idResource = _serialization.idResource;
            this.name = _serialization.name;
            this.framesPerSecond = _serialization.fps;
            this.stepsPerSecond = _serialization.sps;
            this.labels = {};
            for (let name in _serialization.labels) {
                this.labels[name] = _serialization.labels[name];
            }
            this.events = {};
            for (let name in _serialization.events) {
                this.events[name] = _serialization.events[name];
            }
            this.eventsProcessed = new Map();
            this.animationStructure = this.traverseStructureForDeserialisation(_serialization.animationStructure);
            this.animationStructuresProcessed = new Map();
            this.calculateTotalTime();
            return this;
        }
        getMutator() {
            return this.serialize();
        }
        reduceMutator(_mutator) {
            delete _mutator.totalTime;
        }
        /**
         * Traverses an AnimationStructure and returns the Serialization of said Structure.
         * @param _structure The Animation Structure at the current level to transform into the Serialization.
         * @returns the filled Serialization.
         */
        traverseStructureForSerialisation(_structure) {
            let newSerialization = {};
            for (let n in _structure) {
                if (_structure[n] instanceof FudgeCore.AnimationSequence) {
                    newSerialization[n] = _structure[n].serialize();
                }
                else {
                    newSerialization[n] = this.traverseStructureForSerialisation(_structure[n]);
                }
            }
            return newSerialization;
        }
        /**
         * Traverses a Serialization to create a new AnimationStructure.
         * @param _serialization The serialization to transfer into an AnimationStructure
         * @returns the newly created AnimationStructure.
         */
        traverseStructureForDeserialisation(_serialization) {
            let newStructure = {};
            for (let n in _serialization) {
                if (_serialization[n].animationSequence) {
                    let animSeq = new FudgeCore.AnimationSequence();
                    newStructure[n] = animSeq.deserialize(_serialization[n]);
                }
                else {
                    newStructure[n] = this.traverseStructureForDeserialisation(_serialization[n]);
                }
            }
            return newStructure;
        }
        //#endregion
        /**
         * Finds the list of events to be used with these settings.
         * @param _direction The direction the animation is playing in.
         * @param _playback The playbackmode the animation is playing in.
         * @returns The correct AnimationEventTrigger Object to use
         */
        getCorrectEventList(_direction, _playback) {
            if (_playback != FudgeCore.ANIMATION_PLAYBACK.FRAMEBASED) {
                if (_direction >= 0) {
                    return this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.NORMAL);
                }
                else {
                    return this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.REVERSE);
                }
            }
            else {
                if (_direction >= 0) {
                    return this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.RASTERED);
                }
                else {
                    return this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.RASTEREDREVERSE);
                }
            }
        }
        /**
         * Traverses an AnimationStructure to turn it into the "Mutator" to return to the Component.
         * @param _structure The strcuture to traverse
         * @param _time the point in time to write the animation numbers into.
         * @returns The "Mutator" filled with the correct values at the given time.
         */
        traverseStructureForMutator(_structure, _time) {
            let newMutator = {};
            for (let n in _structure) {
                if (_structure[n] instanceof FudgeCore.AnimationSequence) {
                    newMutator[n] = _structure[n].evaluate(_time);
                }
                else {
                    newMutator[n] = this.traverseStructureForMutator(_structure[n], _time);
                }
            }
            return newMutator;
        }
        /**
         * Traverses the current AnimationStrcuture to find the totalTime of this animation.
         * @param _structure The structure to traverse
         */
        traverseStructureForTime(_structure) {
            for (let n in _structure) {
                if (_structure[n] instanceof FudgeCore.AnimationSequence) {
                    let sequence = _structure[n];
                    if (sequence.length > 0) {
                        let sequenceTime = sequence.getKey(sequence.length - 1).Time;
                        this.totalTime = sequenceTime > this.totalTime ? sequenceTime : this.totalTime;
                    }
                }
                else {
                    this.traverseStructureForTime(_structure[n]);
                }
            }
        }
        /**
         * Ensures the existance of the requested [[AnimationStrcuture]] and returns it.
         * @param _type the type of the structure to get
         * @returns the requested [[AnimationStructure]]
         */
        getProcessedAnimationStructure(_type) {
            if (!this.animationStructuresProcessed.has(_type)) {
                this.calculateTotalTime();
                let ae = {};
                switch (_type) {
                    case ANIMATION_STRUCTURE_TYPE.NORMAL:
                        ae = this.animationStructure;
                        break;
                    case ANIMATION_STRUCTURE_TYPE.REVERSE:
                        ae = this.traverseStructureForNewStructure(this.animationStructure, this.calculateReverseSequence.bind(this));
                        break;
                    case ANIMATION_STRUCTURE_TYPE.RASTERED:
                        ae = this.traverseStructureForNewStructure(this.animationStructure, this.calculateRasteredSequence.bind(this));
                        break;
                    case ANIMATION_STRUCTURE_TYPE.RASTEREDREVERSE:
                        ae = this.traverseStructureForNewStructure(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.REVERSE), this.calculateRasteredSequence.bind(this));
                        break;
                    default:
                        return {};
                }
                this.animationStructuresProcessed.set(_type, ae);
            }
            return this.animationStructuresProcessed.get(_type);
        }
        /**
         * Ensures the existance of the requested [[AnimationEventTrigger]] and returns it.
         * @param _type The type of AnimationEventTrigger to get
         * @returns the requested [[AnimationEventTrigger]]
         */
        getProcessedEventTrigger(_type) {
            if (!this.eventsProcessed.has(_type)) {
                this.calculateTotalTime();
                let ev = {};
                switch (_type) {
                    case ANIMATION_STRUCTURE_TYPE.NORMAL:
                        ev = this.events;
                        break;
                    case ANIMATION_STRUCTURE_TYPE.REVERSE:
                        ev = this.calculateReverseEventTriggers(this.events);
                        break;
                    case ANIMATION_STRUCTURE_TYPE.RASTERED:
                        ev = this.calculateRasteredEventTriggers(this.events);
                        break;
                    case ANIMATION_STRUCTURE_TYPE.RASTEREDREVERSE:
                        ev = this.calculateRasteredEventTriggers(this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.REVERSE));
                        break;
                    default:
                        return {};
                }
                this.eventsProcessed.set(_type, ev);
            }
            return this.eventsProcessed.get(_type);
        }
        /**
         * Traverses an existing structure to apply a recalculation function to the AnimationStructure to store in a new Structure.
         * @param _oldStructure The old structure to traverse
         * @param _functionToUse The function to use to recalculated the structure.
         * @returns A new Animation Structure with the recalulated Animation Sequences.
         */
        traverseStructureForNewStructure(_oldStructure, _functionToUse) {
            let newStructure = {};
            for (let n in _oldStructure) {
                if (_oldStructure[n] instanceof FudgeCore.AnimationSequence) {
                    newStructure[n] = _functionToUse(_oldStructure[n]);
                }
                else {
                    newStructure[n] = this.traverseStructureForNewStructure(_oldStructure[n], _functionToUse);
                }
            }
            return newStructure;
        }
        /**
         * Creates a reversed Animation Sequence out of a given Sequence.
         * @param _sequence The sequence to calculate the new sequence out of
         * @returns The reversed Sequence
         */
        calculateReverseSequence(_sequence) {
            let seq = new FudgeCore.AnimationSequence();
            for (let i = 0; i < _sequence.length; i++) {
                let oldKey = _sequence.getKey(i);
                let key = new FudgeCore.AnimationKey(this.totalTime - oldKey.Time, oldKey.Value, oldKey.SlopeOut, oldKey.SlopeIn, oldKey.Constant);
                seq.addKey(key);
            }
            return seq;
        }
        /**
         * Creates a rastered [[AnimationSequence]] out of a given sequence.
         * @param _sequence The sequence to calculate the new sequence out of
         * @returns the rastered sequence.
         */
        calculateRasteredSequence(_sequence) {
            let seq = new FudgeCore.AnimationSequence();
            let frameTime = 1000 / this.framesPerSecond;
            for (let i = 0; i < this.totalTime; i += frameTime) {
                let key = new FudgeCore.AnimationKey(i, _sequence.evaluate(i), 0, 0, true);
                seq.addKey(key);
            }
            return seq;
        }
        /**
         * Creates a new reversed [[AnimationEventTrigger]] object based on the given one.
         * @param _events the event object to calculate the new one out of
         * @returns the reversed event object
         */
        calculateReverseEventTriggers(_events) {
            let ae = {};
            for (let name in _events) {
                ae[name] = this.totalTime - _events[name];
            }
            return ae;
        }
        /**
         * Creates a rastered [[AnimationEventTrigger]] object based on the given one.
         * @param _events the event object to calculate the new one out of
         * @returns the rastered event object
         */
        calculateRasteredEventTriggers(_events) {
            let ae = {};
            let frameTime = 1000 / this.framesPerSecond;
            for (let name in _events) {
                ae[name] = _events[name] - (_events[name] % frameTime);
            }
            return ae;
        }
        /**
         * Checks which events lay between two given times and returns the names of the ones that do.
         * @param _eventTriggers The event object to check the events inside of
         * @param _min the minimum of the range to check between (inclusive)
         * @param _max the maximum of the range to check between (exclusive)
         * @returns an array of the names of the events in the given range.
         */
        checkEventsBetween(_eventTriggers, _min, _max) {
            let eventsToTrigger = [];
            for (let name in _eventTriggers) {
                if (_min <= _eventTriggers[name] && _eventTriggers[name] < _max) {
                    eventsToTrigger.push(name);
                }
            }
            return eventsToTrigger;
        }
    }
    FudgeCore.Animation = Animation;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * Calculates the values between [[AnimationKey]]s.
     * Represented internally by a cubic function (`f(x) = ax³ + bx² + cx + d`).
     * Only needs to be recalculated when the keys change, so at runtime it should only be calculated once.
     * @author Lukas Scheuerle, HFU, 2019
     */
    class AnimationFunction {
        constructor(_keyIn, _keyOut = null) {
            this.a = 0;
            this.b = 0;
            this.c = 0;
            this.d = 0;
            this.keyIn = _keyIn;
            this.keyOut = _keyOut;
            this.calculate();
        }
        /**
         * Calculates the value of the function at the given time.
         * @param _time the point in time at which to evaluate the function in milliseconds. Will be corrected for offset internally.
         * @returns the value at the given time
         */
        evaluate(_time) {
            _time -= this.keyIn.Time;
            let time2 = _time * _time;
            let time3 = time2 * _time;
            return this.a * time3 + this.b * time2 + this.c * _time + this.d;
        }
        set setKeyIn(_keyIn) {
            this.keyIn = _keyIn;
            this.calculate();
        }
        set setKeyOut(_keyOut) {
            this.keyOut = _keyOut;
            this.calculate();
        }
        /**
         * (Re-)Calculates the parameters of the cubic function.
         * See https://math.stackexchange.com/questions/3173469/calculate-cubic-equation-from-two-points-and-two-slopes-variably
         * and https://jirkadelloro.github.io/FUDGE/Documentation/Logs/190410_Notizen_LS
         */
        calculate() {
            if (!this.keyIn) {
                this.d = this.c = this.b = this.a = 0;
                return;
            }
            if (!this.keyOut || this.keyIn.Constant) {
                this.d = this.keyIn.Value;
                this.c = this.b = this.a = 0;
                return;
            }
            let x1 = this.keyOut.Time - this.keyIn.Time;
            this.d = this.keyIn.Value;
            this.c = this.keyIn.SlopeOut;
            this.a = (-x1 * (this.keyIn.SlopeOut + this.keyOut.SlopeIn) - 2 * this.keyIn.Value + 2 * this.keyOut.Value) / -Math.pow(x1, 3);
            this.b = (this.keyOut.SlopeIn - this.keyIn.SlopeOut - 3 * this.a * Math.pow(x1, 2)) / (2 * x1);
        }
    }
    FudgeCore.AnimationFunction = AnimationFunction;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * Holds information about set points in time, their accompanying values as well as their slopes.
     * Also holds a reference to the [[AnimationFunction]]s that come in and out of the sides. The [[AnimationFunction]]s are handled by the [[AnimationSequence]]s.
     * Saved inside an [[AnimationSequence]].
     * @author Lukas Scheuerle, HFU, 2019
     */
    class AnimationKey extends FudgeCore.Mutable {
        constructor(_time = 0, _value = 0, _slopeIn = 0, _slopeOut = 0, _constant = false) {
            super();
            this.constant = false;
            this.slopeIn = 0;
            this.slopeOut = 0;
            this.time = _time;
            this.value = _value;
            this.slopeIn = _slopeIn;
            this.slopeOut = _slopeOut;
            this.constant = _constant;
            this.broken = this.slopeIn != -this.slopeOut;
            this.functionOut = new FudgeCore.AnimationFunction(this, null);
        }
        get Time() {
            return this.time;
        }
        set Time(_time) {
            this.time = _time;
            this.functionIn.calculate();
            this.functionOut.calculate();
        }
        get Value() {
            return this.value;
        }
        set Value(_value) {
            this.value = _value;
            this.functionIn.calculate();
            this.functionOut.calculate();
        }
        get Constant() {
            return this.constant;
        }
        set Constant(_constant) {
            this.constant = _constant;
            this.functionIn.calculate();
            this.functionOut.calculate();
        }
        get SlopeIn() {
            return this.slopeIn;
        }
        set SlopeIn(_slope) {
            this.slopeIn = _slope;
            this.functionIn.calculate();
        }
        get SlopeOut() {
            return this.slopeOut;
        }
        set SlopeOut(_slope) {
            this.slopeOut = _slope;
            this.functionOut.calculate();
        }
        /**
         * Static comparation function to use in an array sort function to sort the keys by their time.
         * @param _a the animation key to check
         * @param _b the animation key to check against
         * @returns >0 if a>b, 0 if a=b, <0 if a<b
         */
        static compare(_a, _b) {
            return _a.time - _b.time;
        }
        //#region transfer
        serialize() {
            let s = {};
            s.time = this.time;
            s.value = this.value;
            s.slopeIn = this.slopeIn;
            s.slopeOut = this.slopeOut;
            s.constant = this.constant;
            return s;
        }
        deserialize(_serialization) {
            this.time = _serialization.time;
            this.value = _serialization.value;
            this.slopeIn = _serialization.slopeIn;
            this.slopeOut = _serialization.slopeOut;
            this.constant = _serialization.constant;
            this.broken = this.slopeIn != -this.slopeOut;
            return this;
        }
        getMutator() {
            return this.serialize();
        }
        reduceMutator(_mutator) {
            //
        }
    }
    FudgeCore.AnimationKey = AnimationKey;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * A sequence of [[AnimationKey]]s that is mapped to an attribute of a [[Node]] or its [[Component]]s inside the [[Animation]].
     * Provides functions to modify said keys
     * @author Lukas Scheuerle, HFU, 2019
     */
    class AnimationSequence extends FudgeCore.Mutable {
        constructor() {
            super(...arguments);
            this.keys = [];
        }
        /**
         * Evaluates the sequence at the given point in time.
         * @param _time the point in time at which to evaluate the sequence in milliseconds.
         * @returns the value of the sequence at the given time. 0 if there are no keys.
         */
        evaluate(_time) {
            if (this.keys.length == 0)
                return 0; //TODO: shouldn't return 0 but something indicating no change, like null. probably needs to be changed in Node as well to ignore non-numeric values in the applyAnimation function
            if (this.keys.length == 1 || this.keys[0].Time >= _time)
                return this.keys[0].Value;
            for (let i = 0; i < this.keys.length - 1; i++) {
                if (this.keys[i].Time <= _time && this.keys[i + 1].Time > _time) {
                    return this.keys[i].functionOut.evaluate(_time);
                }
            }
            return this.keys[this.keys.length - 1].Value;
        }
        /**
         * Adds a new key to the sequence.
         * @param _key the key to add
         */
        addKey(_key) {
            this.keys.push(_key);
            this.keys.sort(FudgeCore.AnimationKey.compare);
            this.regenerateFunctions();
        }
        /**
         * Removes a given key from the sequence.
         * @param _key the key to remove
         */
        removeKey(_key) {
            for (let i = 0; i < this.keys.length; i++) {
                if (this.keys[i] == _key) {
                    this.keys.splice(i, 1);
                    this.regenerateFunctions();
                    return;
                }
            }
        }
        /**
         * Removes the Animation Key at the given index from the keys.
         * @param _index the zero-based index at which to remove the key
         * @returns the removed AnimationKey if successful, null otherwise.
         */
        removeKeyAtIndex(_index) {
            if (_index < 0 || _index >= this.keys.length) {
                return null;
            }
            let ak = this.keys[_index];
            this.keys.splice(_index, 1);
            this.regenerateFunctions();
            return ak;
        }
        /**
         * Gets a key from the sequence at the desired index.
         * @param _index the zero-based index at which to get the key
         * @returns the AnimationKey at the index if it exists, null otherwise.
         */
        getKey(_index) {
            if (_index < 0 || _index >= this.keys.length)
                return null;
            return this.keys[_index];
        }
        get length() {
            return this.keys.length;
        }
        //#region transfer
        serialize() {
            let s = {
                keys: [],
                animationSequence: true
            };
            for (let i = 0; i < this.keys.length; i++) {
                s.keys[i] = this.keys[i].serialize();
            }
            return s;
        }
        deserialize(_serialization) {
            for (let i = 0; i < _serialization.keys.length; i++) {
                // this.keys.push(<AnimationKey>Serializer.deserialize(_serialization.keys[i]));
                let k = new FudgeCore.AnimationKey();
                k.deserialize(_serialization.keys[i]);
                this.keys[i] = k;
            }
            this.regenerateFunctions();
            return this;
        }
        reduceMutator(_mutator) {
            //
        }
        //#endregion
        /**
         * Utility function that (re-)generates all functions in the sequence.
         */
        regenerateFunctions() {
            for (let i = 0; i < this.keys.length; i++) {
                let f = new FudgeCore.AnimationFunction(this.keys[i]);
                this.keys[i].functionOut = f;
                if (i == this.keys.length - 1) {
                    //TODO: check if this is even useful. Maybe update the runcondition to length - 1 instead. Might be redundant if functionIn is removed, see TODO in AnimationKey.
                    f.setKeyOut = this.keys[0];
                    this.keys[0].functionIn = f;
                    break;
                }
                f.setKeyOut = this.keys[i + 1];
                this.keys[i + 1].functionIn = f;
            }
        }
    }
    FudgeCore.AnimationSequence = AnimationSequence;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Describes the [[Audio]] class in which all Audio Data is stored.
     * Audio will be given to the [[ComponentAudio]] for further usage.
     * @authors Thomas Dorner, HFU, 2019
     */
    class Audio {
        /**
         * Constructor for the [[Audio]] Class
         * @param _audioContext from [[AudioSettings]]
         * @param _gainValue 0 for muted | 1 for max volume
         */
        constructor(_audioSettings, _url, _gainValue, _loop) {
            this.init(_audioSettings, _url, _gainValue, _loop);
        }
        async init(_audioSettings, _url, _gainValue, _loop) {
            this.url = _url;
            // Get AudioBuffer
            const bufferProm = _audioSettings.getAudioSession().urlToBuffer(_audioSettings.getAudioContext(), _url);
            while (!bufferProm) {
                console.log("Waiting for Promise..");
            }
            await bufferProm.then(val => {
                this.audioBuffer = val;
            });
            this.localGain = _audioSettings.getAudioContext().createGain();
            this.localGainValue = _gainValue;
            this.localGain.gain.value = this.localGainValue;
            this.createAudio(_audioSettings, this.audioBuffer);
            this.isLooping = _loop;
        }
        initBufferSource(_audioSettings) {
            this.bufferSource = _audioSettings.getAudioContext().createBufferSource();
            this.bufferSource.buffer = this.audioBuffer;
            this.beginLoop();
        }
        setBufferSourceNode(_bufferSourceNode) {
            this.bufferSource = _bufferSourceNode;
        }
        getBufferSourceNode() {
            return this.bufferSource;
        }
        setLocalGain(_localGain) {
            this.localGain = _localGain;
        }
        getLocalGain() {
            return this.localGain;
        }
        setLocalGainValue(_localGainValue) {
            this.localGainValue = _localGainValue;
            this.localGain.gain.value = this.localGainValue;
        }
        getLocalGainValue() {
            return this.localGainValue;
        }
        setLooping(_isLooping) {
            this.isLooping = _isLooping;
        }
        getLooping() {
            return this.isLooping;
        }
        setBufferSource(_buffer) {
            this.audioBuffer = _buffer;
            this.bufferSource.buffer = _buffer;
        }
        getBufferSource() {
            return this.audioBuffer;
        }
        /**
         * createAudio builds an [[Audio]] to use with the [[ComponentAudio]]
         * @param _audioContext from [[AudioSettings]]
         * @param _audioBuffer from [[AudioSessionData]]
         */
        createAudio(_audioSettings, _audioBuffer) {
            this.audioBuffer = _audioBuffer;
            this.initBufferSource(_audioSettings);
            return this.audioBuffer;
        }
        beginLoop() {
            this.bufferSource.loop = this.isLooping;
        }
    }
    FudgeCore.Audio = Audio;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Add an [[AudioDelay]] to an [[Audio]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioDelay {
        constructor(_audioSettings, _delay) {
            this.audioDelay = _audioSettings.getAudioContext().createDelay(_delay);
            this.setDelay(_audioSettings, _delay);
        }
        setDelay(_audioSettings, _delay) {
            this.delay = _delay;
            this.audioDelay.delayTime.setValueAtTime(this.delay, _audioSettings.getAudioContext().currentTime);
        }
        getDelay() {
            return this.delay;
        }
    }
    FudgeCore.AudioDelay = AudioDelay;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Add an [[AudioFilter]] to an [[Audio]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioFilter {
        constructor(_audioSettings, _filterType, _frequency, _gain, _quality) {
            this.initFilter(_audioSettings, _filterType, _frequency, _gain, _quality);
        }
        initFilter(_audioSettings, _filterType, _frequency, _gain, _quality) {
            this.audioFilter = _audioSettings.getAudioContext().createBiquadFilter();
            this.setFilterType(_filterType);
            this.setFrequency(_audioSettings, _frequency);
            this.setGain(_audioSettings, _gain);
            this.setQuality(_quality);
        }
        setFilterType(_filterType) {
            this.filterType = _filterType;
            this.audioFilter.type = this.filterType;
        }
        getFilterType() {
            return this.filterType;
        }
        setFrequency(_audioSettings, _frequency) {
            this.audioFilter.frequency.setValueAtTime(_frequency, _audioSettings.getAudioContext().currentTime);
        }
        getFrequency() {
            return this.audioFilter.frequency.value;
        }
        setGain(_audioSettings, _gain) {
            this.audioFilter.frequency.setValueAtTime(_gain, _audioSettings.getAudioContext().currentTime);
        }
        getGain() {
            return this.audioFilter.gain.value;
        }
        setQuality(_quality) {
            this.audioFilter.Q.value = _quality;
        }
        getQuality() {
            return this.audioFilter.Q.value;
        }
    }
    FudgeCore.AudioFilter = AudioFilter;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Describes a [[AudioListener]] attached to a [[Node]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioListenerX {
        //##TODO AudioListener
        constructor(_audioContext) {
            //this.audioListener = _audioContext.listener;
        }
        /**
         * We will call setAudioListenerPosition whenever there is a need to change Positions.
         * All the position values should be identical to the current Position this is atteched to.
         */
        // public setAudioListenerPosition(_position: Vector3): void {
        //     this.audioListener.positionX.value = _position.x;
        //     this.audioListener.positionY.value = _position.y;
        //     this.audioListener.positionZ.value = _position.z;
        //     this.position = _position;
        // }
        /**
         * getAudioListenerPosition
         */
        getAudioListenerPosition() {
            return this.position;
        }
        /**
         * setAudioListenerOrientation
         */
        // public setAudioListenerOrientation(_orientation: Vector3): void {
        //     this.audioListener.orientationX.value = _orientation.x;
        //     this.audioListener.orientationY.value = _orientation.y;
        //     this.audioListener.orientationZ.value = _orientation.z;
        //     this.orientation = _orientation;
        // }
        /**
         * getAudioListenerOrientation
         */
        getAudioListenerOrientation() {
            return this.orientation;
        }
    }
    FudgeCore.AudioListenerX = AudioListenerX;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * [[AudioLocalisation]] describes the Audio Panner used in [[ComponentAudio]],
     * which contains data for Position, Orientation and other data needed to localize the Audio in a 3D space.
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioLocalisation {
        /**
         * Constructor for the [[AudioLocalisation]] Class
         * @param _audioContext from [[AudioSettings]]
         */
        constructor(_audioSettings) {
            this.pannerNode = _audioSettings.getAudioContext().createPanner();
            this.initDefaultValues();
        }
        updatePositions(_position, _orientation) {
            this.setPannerPosition(_position);
            this.setPannerOrientation(_orientation);
        }
        /**
        * We will call setPannerPosition whenever there is a need to change Positions.
        * All the position values should be identical to the current Position this is attached to.
        *
        *      |
        *      o---
        *    /  __
        *      |_| Position
        *
        */
        setPannerPosition(_position) {
            this.position = _position;
            this.pannerNode.positionX.value = -this.position.x;
            this.pannerNode.positionY.value = -this.position.z;
            this.pannerNode.positionZ.value = this.position.y;
        }
        getPannerPosition() {
            return this.position;
        }
        /**
         * Set Position for orientation target
         *
         *      |
         *      o---
         *    /  __
         *      |_|
         *        \
         *       Target
         */
        setPannerOrientation(_orientation) {
            this.orientation = _orientation;
            this.pannerNode.orientationX.value = this.orientation.x;
            this.pannerNode.orientationY.value = -this.orientation.z;
            this.pannerNode.orientationZ.value = this.orientation.y;
        }
        getPannerOrientation() {
            return this.orientation;
        }
        setDistanceModel(_distanceModelType) {
            this.distanceModel = _distanceModelType;
            this.pannerNode.distanceModel = this.distanceModel;
        }
        getDistanceModel() {
            return this.distanceModel;
        }
        setPanningModel(_panningModelType) {
            this.panningModel = _panningModelType;
            this.pannerNode.panningModel = this.panningModel;
        }
        getPanningModel() {
            return this.panningModel;
        }
        setRefDistance(_refDistance) {
            this.refDistance = _refDistance;
            this.pannerNode.refDistance = this.refDistance;
        }
        getRefDistance() {
            return this.refDistance;
        }
        setMaxDistance(_maxDistance) {
            this.maxDistance = _maxDistance;
            this.pannerNode.maxDistance = this.maxDistance;
        }
        getMaxDistance() {
            return this.maxDistance;
        }
        setRolloffFactor(_rolloffFactor) {
            this.rolloffFactor = _rolloffFactor;
            this.pannerNode.rolloffFactor = this.rolloffFactor;
        }
        getRolloffFactor() {
            return this.rolloffFactor;
        }
        setConeInnerAngle(_coneInnerAngle) {
            this.coneInnerAngle = _coneInnerAngle;
            this.pannerNode.coneInnerAngle = this.coneInnerAngle;
        }
        getConeInnerAngle() {
            return this.coneInnerAngle;
        }
        setConeOuterAngle(_coneOuterAngle) {
            this.coneOuterAngle = _coneOuterAngle;
            this.pannerNode.coneOuterAngle = this.coneOuterAngle;
        }
        getConeOuterAngle() {
            return this.coneOuterAngle;
        }
        setConeOuterGain(_coneOuterGain) {
            this.coneOuterGain = _coneOuterGain;
            this.pannerNode.coneOuterGain = this.coneOuterGain;
        }
        getConeOuterGain() {
            return this.coneOuterGain;
        }
        /**
         * Show all Settings inside of [[AudioLocalisation]].
         * Use for Debugging purposes.
         */
        showLocalisationSettings() {
            console.log("------------------------------");
            console.log("Show all Settings of Panner");
            console.log("------------------------------");
            console.log("Panner Position: X: " + this.pannerNode.positionX.value + " | Y: " + this.pannerNode.positionY.value + " | Z: " + this.pannerNode.positionZ.value);
            console.log("Panner Orientation: X: " + this.pannerNode.orientationX.value + " | Y: " + this.pannerNode.orientationY.value + " | Z: " + this.pannerNode.orientationZ.value);
            console.log("Distance Model Type: " + this.distanceModel);
            console.log("Panner Model Type: " + this.panningModel);
            console.log("Ref Distance: " + this.refDistance);
            console.log("Max Distance: " + this.maxDistance);
            console.log("Rolloff Factor: " + this.rolloffFactor);
            console.log("Cone Inner Angle: " + this.coneInnerAngle);
            console.log("Cone Outer Angle: " + this.coneOuterAngle);
            console.log("Cone Outer Gain: " + this.coneOuterGain);
            console.log("------------------------------");
        }
        initDefaultValues() {
            this.setPanningModel("HRTF");
            this.setDistanceModel("inverse");
            this.setConeInnerAngle(90);
            this.setConeOuterAngle(270);
            this.setConeOuterGain(0);
            this.setRefDistance(1);
            this.setMaxDistance(5);
            this.setRolloffFactor(1);
            this.showLocalisationSettings();
        }
    }
    FudgeCore.AudioLocalisation = AudioLocalisation;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Add an [[AudioFilter]] to an [[Audio]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioOscillator {
        constructor(_audioSettings, _oscillatorType) {
            this.audioOscillator = _audioSettings.getAudioContext().createOscillator();
            this.localGain = _audioSettings.getAudioContext().createGain();
            this.oscillatorType = _oscillatorType;
            if (this.oscillatorType != "custom") {
                this.audioOscillator.type = this.oscillatorType;
            }
            else {
                if (!this.oscillatorWave) {
                    this.audioOscillator.setPeriodicWave(this.oscillatorWave);
                }
                else {
                    console.log("Create a Custom Periodic Wave first to use Custom Type");
                }
            }
        }
        setOscillatorType(_oscillatorType) {
            if (this.oscillatorType != "custom") {
                this.audioOscillator.type = this.oscillatorType;
            }
            else {
                if (!this.oscillatorWave) {
                    this.audioOscillator.setPeriodicWave(this.oscillatorWave);
                }
            }
        }
        getOscillatorType() {
            return this.oscillatorType;
        }
        createPeriodicWave(_audioSettings, _real, _imag) {
            let waveReal = new Float32Array(2);
            waveReal[0] = _real.startpoint;
            waveReal[1] = _real.endpoint;
            let waveImag = new Float32Array(2);
            waveImag[0] = _imag.startpoint;
            waveImag[1] = _imag.endpoint;
            this.oscillatorWave = _audioSettings.getAudioContext().createPeriodicWave(waveReal, waveImag);
        }
        setLocalGain(_localGain) {
            this.localGain = _localGain;
        }
        getLocalGain() {
            return this.localGain;
        }
        setLocalGainValue(_localGainValue) {
            this.localGainValue = _localGainValue;
            this.localGain.gain.value = this.localGainValue;
        }
        getLocalGainValue() {
            return this.localGainValue;
        }
        setFrequency(_audioSettings, _frequency) {
            this.frequency = _frequency;
            this.audioOscillator.frequency.setValueAtTime(this.frequency, _audioSettings.getAudioContext().currentTime);
        }
        getFrequency() {
            return this.frequency;
        }
        createSnare(_audioSettings) {
            this.setOscillatorType("triangle");
            this.setFrequency(_audioSettings, 100);
            this.setLocalGainValue(0);
            this.localGain.gain.setValueAtTime(0, _audioSettings.getAudioContext().currentTime);
            this.localGain.gain.exponentialRampToValueAtTime(0.01, _audioSettings.getAudioContext().currentTime + .1);
            this.audioOscillator.connect(this.localGain);
        }
    }
    FudgeCore.AudioOscillator = AudioOscillator;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Describes Data Handler for all Audio Sources
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioSessionData {
        /**
         * Constructor of the [[AudioSessionData]] Class.
         */
        constructor() {
            this.dataArray = new Array();
        }
        /**
         * Decoding Audio Data
         * Asynchronous Function to permit the loading of multiple Data Sources at the same time
         * @param _audioContext AudioContext from AudioSettings
         * @param _url URL as String for Data fetching
         */
        async urlToBuffer(_audioContext, _url) {
            let initObject = {
                method: "GET",
                mode: "same-origin",
                cache: "no-cache",
                headers: {
                    "Content-Type": "audio/mpeg3"
                },
                redirect: "follow" // default -> follow
            };
            let buffer = null;
            for (let x = 0; x < this.dataArray.length; x++) {
                if (this.dataArray[x].url == _url) {
                    console.log("Existing URL found");
                    if (this.dataArray[x].buffer == null) {
                        const response = await window.fetch(_url, initObject);
                        const arrayBuffer = await response.arrayBuffer();
                        const decodedAudio = await _audioContext.decodeAudioData(arrayBuffer);
                        this.pushBufferInArray(_url, decodedAudio);
                        return decodedAudio;
                    }
                    else {
                        buffer = await this.dataArray[x].buffer;
                        return this.dataArray[x].buffer;
                    }
                }
            }
            if (buffer == null) {
                try {
                    this.pushUrlInArray(_url);
                    const response = await window.fetch(_url, initObject);
                    const arrayBuffer = await response.arrayBuffer();
                    const decodedAudio = await _audioContext.decodeAudioData(arrayBuffer);
                    this.pushBufferInArray(_url, decodedAudio);
                    return decodedAudio;
                }
                catch (_error) {
                    this.logErrorFetch(_error);
                    return null;
                }
            }
            else {
                return null;
            }
        }
        /**
         * Push URL into Data Array to create a Placeholder in which the Buffer can be placed at a later time
         */
        /**
         *
         * @param _url
         * @param _audioBuffer
         */
        pushBufferInArray(_url, _audioBuffer) {
            for (let x = 0; x < this.dataArray.length; x++) {
                if (this.dataArray[x].url == _url) {
                    if (this.dataArray[x].buffer == null) {
                        this.dataArray[x].buffer = _audioBuffer;
                        return;
                    }
                }
            }
        }
        /**
         * Create a new log for the Data Array.
         * Uses a url and creates a placeholder for the AudioBuffer.
         * The AudioBuffer gets added as soon as it is created.
         * @param _url Add a url to a wanted resource as a string
         */
        pushUrlInArray(_url) {
            let data;
            data = {
                url: _url,
                buffer: null
            };
            this.dataArray.push(data);
        }
        /**
         * Show all Data in Array.
         * Use this for Debugging purposes.
         */
        showDataInArray() {
            for (let x = 0; x < this.dataArray.length; x++) {
                console.log("Array Data: " + this.dataArray[x].url + this.dataArray[x].buffer);
            }
        }
        /**
         * Error Message for Data Fetching
         * @param e Error
         */
        logErrorFetch(_error) {
            console.log("Audio error", _error);
        }
    }
    FudgeCore.AudioSessionData = AudioSessionData;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Describes Global Audio Settings.
     * Is meant to be used as a Menu option.
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioSettings {
        //
        /**
         * Constructor for the [[AudioSettings]] Class.
         * Main class for all Audio Classes.
         * Need to create this first, when working with sounds.
         */
        constructor() {
            this.setAudioContext(new AudioContext({ latencyHint: "interactive", sampleRate: 44100 }));
            //this.globalAudioContext.resume();
            this.masterGain = this.globalAudioContext.createGain();
            this.setMasterGainValue(1);
            this.setAudioSession(new FudgeCore.AudioSessionData());
            this.masterGain.connect(this.globalAudioContext.destination);
        }
        setMasterGainValue(_masterGainValue) {
            this.masterGainValue = _masterGainValue;
            this.masterGain.gain.value = this.masterGainValue;
        }
        getMasterGainValue() {
            return this.masterGainValue;
        }
        getAudioContext() {
            return this.globalAudioContext;
        }
        setAudioContext(_audioContext) {
            this.globalAudioContext = _audioContext;
        }
        getAudioSession() {
            return this.audioSessionData;
        }
        setAudioSession(_audioSession) {
            this.audioSessionData = _audioSession;
        }
        /**
         * Pauses the progression of time of the AudioContext.
         */
        suspendAudioContext() {
            this.globalAudioContext.suspend();
        }
        /**
         * Resumes the progression of time of the AudioContext after pausing it.
         */
        resumeAudioContext() {
            this.globalAudioContext.resume();
        }
    }
    FudgeCore.AudioSettings = AudioSettings;
})(FudgeCore || (FudgeCore = {}));
//<reference path="../Coats/Coat.ts"/>
var FudgeCore;
//<reference path="../Coats/Coat.ts"/>
(function (FudgeCore) {
    class RenderInjector {
        static decorateCoat(_constructor) {
            let coatInjection = RenderInjector.coatInjections[_constructor.name];
            if (!coatInjection) {
                FudgeCore.Debug.error("No injection decorator defined for " + _constructor.name);
            }
            Object.defineProperty(_constructor.prototype, "useRenderData", {
                value: coatInjection
            });
        }
        static injectRenderDataForCoatColored(_renderShader) {
            let colorUniformLocation = _renderShader.uniforms["u_color"];
            // let { r, g, b, a } = (<CoatColored>this).color;
            // let color: Float32Array = new Float32Array([r, g, b, a]);
            let color = this.color.getArray();
            FudgeCore.RenderOperator.getRenderingContext().uniform4fv(colorUniformLocation, color);
        }
        static injectRenderDataForCoatTextured(_renderShader) {
            let crc3 = FudgeCore.RenderOperator.getRenderingContext();
            if (this.renderData) {
                // buffers exist
                crc3.activeTexture(WebGL2RenderingContext.TEXTURE0);
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, this.renderData["texture0"]);
                crc3.uniform1i(_renderShader.uniforms["u_texture"], 0);
            }
            else {
                this.renderData = {};
                // TODO: check if all WebGL-Creations are asserted
                const texture = FudgeCore.RenderManager.assert(crc3.createTexture());
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, texture);
                try {
                    crc3.texImage2D(crc3.TEXTURE_2D, 0, crc3.RGBA, crc3.RGBA, crc3.UNSIGNED_BYTE, this.texture.image);
                    crc3.texImage2D(WebGL2RenderingContext.TEXTURE_2D, 0, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE, this.texture.image);
                }
                catch (_error) {
                    FudgeCore.Debug.error(_error);
                }
                crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MAG_FILTER, WebGL2RenderingContext.NEAREST);
                crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.NEAREST);
                crc3.generateMipmap(crc3.TEXTURE_2D);
                this.renderData["texture0"] = texture;
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);
                this.useRenderData(_renderShader);
            }
        }
        static injectRenderDataForCoatMatCap(_renderShader) {
            let crc3 = FudgeCore.RenderOperator.getRenderingContext();
            let colorUniformLocation = _renderShader.uniforms["u_tint_color"];
            let { r, g, b, a } = this.tintColor;
            let tintColorArray = new Float32Array([r, g, b, a]);
            crc3.uniform4fv(colorUniformLocation, tintColorArray);
            let floatUniformLocation = _renderShader.uniforms["u_flatmix"];
            let flatMix = this.flatMix;
            crc3.uniform1f(floatUniformLocation, flatMix);
            if (this.renderData) {
                // buffers exist
                crc3.activeTexture(WebGL2RenderingContext.TEXTURE0);
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, this.renderData["texture0"]);
                crc3.uniform1i(_renderShader.uniforms["u_texture"], 0);
            }
            else {
                this.renderData = {};
                // TODO: check if all WebGL-Creations are asserted
                const texture = FudgeCore.RenderManager.assert(crc3.createTexture());
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, texture);
                try {
                    crc3.texImage2D(crc3.TEXTURE_2D, 0, crc3.RGBA, crc3.RGBA, crc3.UNSIGNED_BYTE, this.texture.image);
                    crc3.texImage2D(WebGL2RenderingContext.TEXTURE_2D, 0, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE, this.texture.image);
                }
                catch (_error) {
                    FudgeCore.Debug.error(_error);
                }
                crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MAG_FILTER, WebGL2RenderingContext.NEAREST);
                crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.NEAREST);
                crc3.generateMipmap(crc3.TEXTURE_2D);
                this.renderData["texture0"] = texture;
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);
                this.useRenderData(_renderShader);
            }
        }
    }
    RenderInjector.coatInjections = {
        "CoatColored": RenderInjector.injectRenderDataForCoatColored,
        "CoatTextured": RenderInjector.injectRenderDataForCoatTextured,
        "CoatMatCap": RenderInjector.injectRenderDataForCoatMatCap
    };
    FudgeCore.RenderInjector = RenderInjector;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Base class for RenderManager, handling the connection to the rendering system, in this case WebGL.
     * Methods and attributes of this class should not be called directly, only through [[RenderManager]]
     */
    class RenderOperator {
        /**
        * Checks the first parameter and throws an exception with the WebGL-errorcode if the value is null
        * @param _value // value to check against null
        * @param _message // optional, additional message for the exception
        */
        static assert(_value, _message = "") {
            if (_value === null)
                throw new Error(`Assertion failed. ${_message}, WebGL-Error: ${RenderOperator.crc3 ? RenderOperator.crc3.getError() : ""}`);
            return _value;
        }
        /**
         * Initializes offscreen-canvas, renderingcontext and hardware viewport.
         */
        static initialize(_antialias = false, _alpha = false) {
            let contextAttributes = { alpha: _alpha, antialias: _antialias };
            let canvas = document.createElement("canvas");
            RenderOperator.crc3 = RenderOperator.assert(canvas.getContext("webgl2", contextAttributes), "WebGL-context couldn't be created");
            // Enable backface- and zBuffer-culling.
            RenderOperator.crc3.enable(WebGL2RenderingContext.CULL_FACE);
            RenderOperator.crc3.enable(WebGL2RenderingContext.DEPTH_TEST);
            // RenderOperator.crc3.pixelStorei(WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL, true);
            RenderOperator.rectViewport = RenderOperator.getCanvasRect();
            RenderOperator.renderShaderRayCast = RenderOperator.createProgram(FudgeCore.ShaderRayCast);
        }
        /**
         * Return a reference to the offscreen-canvas
         */
        static getCanvas() {
            return RenderOperator.crc3.canvas; // TODO: enable OffscreenCanvas
        }
        /**
         * Return a reference to the rendering context
         */
        static getRenderingContext() {
            return RenderOperator.crc3;
        }
        /**
         * Return a rectangle describing the size of the offscreen-canvas. x,y are 0 at all times.
         */
        static getCanvasRect() {
            let canvas = RenderOperator.crc3.canvas;
            return FudgeCore.Rectangle.GET(0, 0, canvas.width, canvas.height);
        }
        /**
         * Set the size of the offscreen-canvas.
         */
        static setCanvasSize(_width, _height) {
            RenderOperator.crc3.canvas.width = _width;
            RenderOperator.crc3.canvas.height = _height;
        }
        /**
         * Set the area on the offscreen-canvas to render the camera image to.
         * @param _rect
         */
        static setViewportRectangle(_rect) {
            Object.assign(RenderOperator.rectViewport, _rect);
            RenderOperator.crc3.viewport(_rect.x, _rect.y, _rect.width, _rect.height);
        }
        /**
         * Retrieve the area on the offscreen-canvas the camera image gets rendered to.
         */
        static getViewportRectangle() {
            return RenderOperator.rectViewport;
        }
        /**
         * Convert light data to flat arrays
         * TODO: this method appears to be obsolete...?
         */
        static createRenderLights(_lights) {
            let renderLights = {};
            for (let entry of _lights) {
                // TODO: simplyfy, since direction is now handled by ComponentLight
                switch (entry[0]) {
                    case FudgeCore.LightAmbient:
                        let ambient = [];
                        for (let cmpLight of entry[1]) {
                            let c = cmpLight.light.color;
                            ambient.push(c.r, c.g, c.b, c.a);
                        }
                        renderLights["u_ambient"] = new Float32Array(ambient);
                        break;
                    case FudgeCore.LightDirectional:
                        let directional = [];
                        for (let cmpLight of entry[1]) {
                            let c = cmpLight.light.color;
                            // let d: Vector3 = (<LightDirectional>light.getLight()).direction;
                            directional.push(c.r, c.g, c.b, c.a, 0, 0, 1);
                        }
                        renderLights["u_directional"] = new Float32Array(directional);
                        break;
                    default:
                        FudgeCore.Debug.warn("Shaderstructure undefined for", entry[0]);
                }
            }
            return renderLights;
        }
        /**
         * Set light data in shaders
         */
        static setLightsInShader(_renderShader, _lights) {
            RenderOperator.useProgram(_renderShader);
            let uni = _renderShader.uniforms;
            let ambient = uni["u_ambient.color"];
            if (ambient) {
                let cmpLights = _lights.get(FudgeCore.LightAmbient);
                if (cmpLights) {
                    // TODO: add up ambient lights to a single color
                    let result = new FudgeCore.Color(0, 0, 0, 1);
                    for (let cmpLight of cmpLights)
                        result.add(cmpLight.light.color);
                    RenderOperator.crc3.uniform4fv(ambient, result.getArray());
                }
            }
            let nDirectional = uni["u_nLightsDirectional"];
            if (nDirectional) {
                let cmpLights = _lights.get(FudgeCore.LightDirectional);
                if (cmpLights) {
                    let n = cmpLights.length;
                    RenderOperator.crc3.uniform1ui(nDirectional, n);
                    for (let i = 0; i < n; i++) {
                        let cmpLight = cmpLights[i];
                        RenderOperator.crc3.uniform4fv(uni[`u_directional[${i}].color`], cmpLight.light.color.getArray());
                        let direction = FudgeCore.Vector3.Z();
                        direction.transform(cmpLight.pivot);
                        direction.transform(cmpLight.getContainer().mtxWorld);
                        RenderOperator.crc3.uniform3fv(uni[`u_directional[${i}].direction`], direction.get());
                    }
                }
            }
            // debugger;
        }
        /**
         * Draw a mesh buffer using the given infos and the complete projection matrix
         * @param _renderShader
         * @param _renderBuffers
         * @param _renderCoat
         * @param _world
         * @param _projection
         */
        static draw(_renderShader, _renderBuffers, _renderCoat, _world, _projection) {
            RenderOperator.useProgram(_renderShader);
            // RenderOperator.useBuffers(_renderBuffers);
            // RenderOperator.useParameter(_renderCoat);
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.vertices);
            RenderOperator.crc3.enableVertexAttribArray(_renderShader.attributes["a_position"]);
            RenderOperator.setAttributeStructure(_renderShader.attributes["a_position"], FudgeCore.Mesh.getBufferSpecification());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, _renderBuffers.indices);
            if (_renderShader.attributes["a_textureUVs"]) {
                RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.textureUVs);
                RenderOperator.crc3.enableVertexAttribArray(_renderShader.attributes["a_textureUVs"]); // enable the buffer
                RenderOperator.crc3.vertexAttribPointer(_renderShader.attributes["a_textureUVs"], 2, WebGL2RenderingContext.FLOAT, false, 0, 0);
            }
            // Supply matrixdata to shader. 
            let uProjection = _renderShader.uniforms["u_projection"];
            RenderOperator.crc3.uniformMatrix4fv(uProjection, false, _projection.get());
            if (_renderShader.uniforms["u_world"]) {
                let uWorld = _renderShader.uniforms["u_world"];
                RenderOperator.crc3.uniformMatrix4fv(uWorld, false, _world.get());
                RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.normalsFace);
                RenderOperator.crc3.enableVertexAttribArray(_renderShader.attributes["a_normal"]);
                RenderOperator.setAttributeStructure(_renderShader.attributes["a_normal"], FudgeCore.Mesh.getBufferSpecification());
            }
            // TODO: this is all that's left of coat handling in RenderOperator, due to injection. So extra reference from node to coat is unnecessary
            _renderCoat.coat.useRenderData(_renderShader);
            // Draw call
            // RenderOperator.crc3.drawElements(WebGL2RenderingContext.TRIANGLES, Mesh.getBufferSpecification().offset, _renderBuffers.nIndices);
            RenderOperator.crc3.drawElements(WebGL2RenderingContext.TRIANGLES, _renderBuffers.nIndices, WebGL2RenderingContext.UNSIGNED_SHORT, 0);
        }
        /**
         * Draw a buffer with a special shader that uses an id instead of a color
         * @param _renderShader
         * @param _renderBuffers
         * @param _world
         * @param _projection
         */
        static drawForRayCast(_id, _renderBuffers, _world, _projection) {
            let renderShader = RenderOperator.renderShaderRayCast;
            RenderOperator.useProgram(renderShader);
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.vertices);
            RenderOperator.crc3.enableVertexAttribArray(renderShader.attributes["a_position"]);
            RenderOperator.setAttributeStructure(renderShader.attributes["a_position"], FudgeCore.Mesh.getBufferSpecification());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, _renderBuffers.indices);
            // Supply matrixdata to shader. 
            let uProjection = renderShader.uniforms["u_projection"];
            RenderOperator.crc3.uniformMatrix4fv(uProjection, false, _projection.get());
            if (renderShader.uniforms["u_world"]) {
                let uWorld = renderShader.uniforms["u_world"];
                RenderOperator.crc3.uniformMatrix4fv(uWorld, false, _world.get());
            }
            let idUniformLocation = renderShader.uniforms["u_id"];
            RenderOperator.getRenderingContext().uniform1i(idUniformLocation, _id);
            RenderOperator.crc3.drawElements(WebGL2RenderingContext.TRIANGLES, _renderBuffers.nIndices, WebGL2RenderingContext.UNSIGNED_SHORT, 0);
        }
        // #region Shaderprogram 
        static createProgram(_shaderClass) {
            let crc3 = RenderOperator.crc3;
            let program = crc3.createProgram();
            let renderShader;
            try {
                crc3.attachShader(program, RenderOperator.assert(compileShader(_shaderClass.getVertexShaderSource(), WebGL2RenderingContext.VERTEX_SHADER)));
                crc3.attachShader(program, RenderOperator.assert(compileShader(_shaderClass.getFragmentShaderSource(), WebGL2RenderingContext.FRAGMENT_SHADER)));
                crc3.linkProgram(program);
                let error = RenderOperator.assert(crc3.getProgramInfoLog(program));
                if (error !== "") {
                    throw new Error("Error linking Shader: " + error);
                }
                renderShader = {
                    program: program,
                    attributes: detectAttributes(),
                    uniforms: detectUniforms()
                };
            }
            catch (_error) {
                FudgeCore.Debug.error(_error);
                debugger;
            }
            return renderShader;
            function compileShader(_shaderCode, _shaderType) {
                let webGLShader = crc3.createShader(_shaderType);
                crc3.shaderSource(webGLShader, _shaderCode);
                crc3.compileShader(webGLShader);
                let error = RenderOperator.assert(crc3.getShaderInfoLog(webGLShader));
                if (error !== "") {
                    throw new Error("Error compiling shader: " + error);
                }
                // Check for any compilation errors.
                if (!crc3.getShaderParameter(webGLShader, WebGL2RenderingContext.COMPILE_STATUS)) {
                    alert(crc3.getShaderInfoLog(webGLShader));
                    return null;
                }
                return webGLShader;
            }
            function detectAttributes() {
                let detectedAttributes = {};
                let attributeCount = crc3.getProgramParameter(program, WebGL2RenderingContext.ACTIVE_ATTRIBUTES);
                for (let i = 0; i < attributeCount; i++) {
                    let attributeInfo = RenderOperator.assert(crc3.getActiveAttrib(program, i));
                    if (!attributeInfo) {
                        break;
                    }
                    detectedAttributes[attributeInfo.name] = crc3.getAttribLocation(program, attributeInfo.name);
                }
                return detectedAttributes;
            }
            function detectUniforms() {
                let detectedUniforms = {};
                let uniformCount = crc3.getProgramParameter(program, WebGL2RenderingContext.ACTIVE_UNIFORMS);
                for (let i = 0; i < uniformCount; i++) {
                    let info = RenderOperator.assert(crc3.getActiveUniform(program, i));
                    if (!info) {
                        break;
                    }
                    detectedUniforms[info.name] = RenderOperator.assert(crc3.getUniformLocation(program, info.name));
                }
                return detectedUniforms;
            }
        }
        static useProgram(_shaderInfo) {
            RenderOperator.crc3.useProgram(_shaderInfo.program);
            RenderOperator.crc3.enableVertexAttribArray(_shaderInfo.attributes["a_position"]);
        }
        static deleteProgram(_program) {
            if (_program) {
                RenderOperator.crc3.deleteProgram(_program.program);
                delete _program.attributes;
                delete _program.uniforms;
            }
        }
        // #endregion
        // #region Meshbuffer
        static createBuffers(_mesh) {
            let vertices = RenderOperator.assert(RenderOperator.crc3.createBuffer());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, vertices);
            RenderOperator.crc3.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, _mesh.vertices, WebGL2RenderingContext.STATIC_DRAW);
            let indices = RenderOperator.assert(RenderOperator.crc3.createBuffer());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, indices);
            RenderOperator.crc3.bufferData(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, _mesh.indices, WebGL2RenderingContext.STATIC_DRAW);
            let textureUVs = RenderOperator.crc3.createBuffer();
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, textureUVs);
            RenderOperator.crc3.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, _mesh.textureUVs, WebGL2RenderingContext.STATIC_DRAW);
            let normalsFace = RenderOperator.assert(RenderOperator.crc3.createBuffer());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, normalsFace);
            RenderOperator.crc3.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, _mesh.normalsFace, WebGL2RenderingContext.STATIC_DRAW);
            let bufferInfo = {
                vertices: vertices,
                indices: indices,
                nIndices: _mesh.getIndexCount(),
                textureUVs: textureUVs,
                normalsFace: normalsFace
            };
            return bufferInfo;
        }
        static useBuffers(_renderBuffers) {
            // TODO: currently unused, done specifically in draw. Could be saved in VAO within RenderBuffers
            // RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.vertices);
            // RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, _renderBuffers.indices);
            // RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.textureUVs);
        }
        static deleteBuffers(_renderBuffers) {
            if (_renderBuffers) {
                RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
                RenderOperator.crc3.deleteBuffer(_renderBuffers.vertices);
                RenderOperator.crc3.deleteBuffer(_renderBuffers.textureUVs);
                RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, null);
                RenderOperator.crc3.deleteBuffer(_renderBuffers.indices);
            }
        }
        // #endregion
        // #region MaterialParameters
        static createParameter(_coat) {
            // let vao: WebGLVertexArrayObject = RenderOperator.assert<WebGLVertexArrayObject>(RenderOperator.crc3.createVertexArray());
            let coatInfo = {
                //vao: null,
                coat: _coat
            };
            return coatInfo;
        }
        static useParameter(_coatInfo) {
            // RenderOperator.crc3.bindVertexArray(_coatInfo.vao);
        }
        static deleteParameter(_coatInfo) {
            if (_coatInfo) {
                RenderOperator.crc3.bindVertexArray(null);
                // RenderOperator.crc3.deleteVertexArray(_coatInfo.vao);
            }
        }
        // #endregion
        /**
         * Wrapper function to utilize the bufferSpecification interface when passing data to the shader via a buffer.
         * @param _attributeLocation // The location of the attribute on the shader, to which they data will be passed.
         * @param _bufferSpecification // Interface passing datapullspecifications to the buffer.
         */
        static setAttributeStructure(_attributeLocation, _bufferSpecification) {
            RenderOperator.crc3.vertexAttribPointer(_attributeLocation, _bufferSpecification.size, _bufferSpecification.dataType, _bufferSpecification.normalize, _bufferSpecification.stride, _bufferSpecification.offset);
        }
    }
    FudgeCore.RenderOperator = RenderOperator;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Mutable.ts"/>
/// <reference path="../Render/RenderInjector.ts"/>
/// <reference path="../Render/RenderOperator.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Mutable.ts"/>
/// <reference path="../Render/RenderInjector.ts"/>
/// <reference path="../Render/RenderOperator.ts"/>
(function (FudgeCore) {
    /**
     * Holds data to feed into a [[Shader]] to describe the surface of [[Mesh]].
     * [[Material]]s reference [[Coat]] and [[Shader]].
     * The method useRenderData will be injected by [[RenderInjector]] at runtime, extending the functionality of this class to deal with the renderer.
     */
    class Coat extends FudgeCore.Mutable {
        constructor() {
            super(...arguments);
            this.name = "Coat";
            //#endregion
        }
        mutate(_mutator) {
            super.mutate(_mutator);
        }
        useRenderData(_renderShader) { }
        //#region Transfer
        serialize() {
            let serialization = this.getMutator();
            return serialization;
        }
        deserialize(_serialization) {
            this.mutate(_serialization);
            return this;
        }
        reduceMutator() { }
    }
    FudgeCore.Coat = Coat;
    /**
     * The simplest [[Coat]] providing just a color
     */
    let CoatColored = class CoatColored extends Coat {
        constructor(_color) {
            super();
            this.color = _color || new FudgeCore.Color(0.5, 0.5, 0.5, 1);
        }
    };
    CoatColored = __decorate([
        FudgeCore.RenderInjector.decorateCoat
    ], CoatColored);
    FudgeCore.CoatColored = CoatColored;
    /**
     * A [[Coat]] providing a texture and additional data for texturing
     */
    let CoatTextured = class CoatTextured extends Coat {
        constructor() {
            super(...arguments);
            this.texture = null;
        }
    };
    CoatTextured = __decorate([
        FudgeCore.RenderInjector.decorateCoat
    ], CoatTextured);
    FudgeCore.CoatTextured = CoatTextured;
    /**
     * A [[Coat]] to be used by the MatCap Shader providing a texture, a tint color (0.5 grey is neutral)
     * and a flatMix number for mixing between smooth and flat shading.
     */
    let CoatMatCap = class CoatMatCap extends Coat {
        constructor(_texture, _tintcolor, _flatmix) {
            super();
            this.texture = null;
            this.tintColor = new FudgeCore.Color(0.5, 0.5, 0.5, 1);
            this.flatMix = 0.5;
            this.texture = _texture || new FudgeCore.TextureImage();
            this.tintColor = _tintcolor || new FudgeCore.Color(0.5, 0.5, 0.5, 1);
            this.flatMix = _flatmix > 1.0 ? this.flatMix = 1.0 : this.flatMix = _flatmix || 0.5;
        }
    };
    CoatMatCap = __decorate([
        FudgeCore.RenderInjector.decorateCoat
    ], CoatMatCap);
    FudgeCore.CoatMatCap = CoatMatCap;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * Superclass for all [[Component]]s that can be attached to [[Node]]s.
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Component extends FudgeCore.Mutable {
        constructor() {
            super(...arguments);
            this.singleton = true;
            this.container = null;
            this.active = true;
            //#endregion
        }
        activate(_on) {
            this.active = _on;
            this.dispatchEvent(new Event(_on ? "componentActivate" /* COMPONENT_ACTIVATE */ : "componentDeactivate" /* COMPONENT_DEACTIVATE */));
        }
        get isActive() {
            return this.active;
        }
        /**
         * Is true, when only one instance of the component class can be attached to a node
         */
        get isSingleton() {
            return this.singleton;
        }
        /**
         * Retrieves the node, this component is currently attached to
         * @returns The container node or null, if the component is not attached to
         */
        getContainer() {
            return this.container;
        }
        /**
         * Tries to add the component to the given node, removing it from the previous container if applicable
         * @param _container The node to attach this component to
         */
        setContainer(_container) {
            if (this.container == _container)
                return;
            let previousContainer = this.container;
            try {
                if (previousContainer)
                    previousContainer.removeComponent(this);
                this.container = _container;
                if (this.container)
                    this.container.addComponent(this);
            }
            catch (_error) {
                this.container = previousContainer;
            }
        }
        //#region Transfer
        serialize() {
            let serialization = {
                active: this.active
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.active = _serialization.active;
            return this;
        }
        reduceMutator(_mutator) {
            delete _mutator.singleton;
            delete _mutator.container;
        }
    }
    FudgeCore.Component = Component;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="Component.ts"/>
var FudgeCore;
/// <reference path="Component.ts"/>
(function (FudgeCore) {
    /**
     * Holds different playmodes the animation uses to play back its animation.
     * @author Lukas Scheuerle, HFU, 2019
     */
    let ANIMATION_PLAYMODE;
    (function (ANIMATION_PLAYMODE) {
        /**Plays animation in a loop: it restarts once it hit the end.*/
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["LOOP"] = 0] = "LOOP";
        /**Plays animation once and stops at the last key/frame*/
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["PLAYONCE"] = 1] = "PLAYONCE";
        /**Plays animation once and stops on the first key/frame */
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["PLAYONCESTOPAFTER"] = 2] = "PLAYONCESTOPAFTER";
        /**Plays animation like LOOP, but backwards.*/
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["REVERSELOOP"] = 3] = "REVERSELOOP";
        /**Causes the animation not to play at all. Useful for jumping to various positions in the animation without proceeding in the animation.*/
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["STOP"] = 4] = "STOP";
        //TODO: add an INHERIT and a PINGPONG mode
    })(ANIMATION_PLAYMODE = FudgeCore.ANIMATION_PLAYMODE || (FudgeCore.ANIMATION_PLAYMODE = {}));
    let ANIMATION_PLAYBACK;
    (function (ANIMATION_PLAYBACK) {
        //TODO: add an in-depth description of what happens to the animation (and events) depending on the Playback. Use Graphs to explain.
        /**Calculates the state of the animation at the exact position of time. Ignores FPS value of animation.*/
        ANIMATION_PLAYBACK[ANIMATION_PLAYBACK["TIMEBASED_CONTINOUS"] = 0] = "TIMEBASED_CONTINOUS";
        /**Limits the calculation of the state of the animation to the FPS value of the animation. Skips frames if needed.*/
        ANIMATION_PLAYBACK[ANIMATION_PLAYBACK["TIMEBASED_RASTERED_TO_FPS"] = 1] = "TIMEBASED_RASTERED_TO_FPS";
        /**Uses the FPS value of the animation to advance once per frame, no matter the speed of the frames. Doesn't skip any frames.*/
        ANIMATION_PLAYBACK[ANIMATION_PLAYBACK["FRAMEBASED"] = 2] = "FRAMEBASED";
    })(ANIMATION_PLAYBACK = FudgeCore.ANIMATION_PLAYBACK || (FudgeCore.ANIMATION_PLAYBACK = {}));
    /**
     * Holds a reference to an [[Animation]] and controls it. Controls playback and playmode as well as speed.
     * @authors Lukas Scheuerle, HFU, 2019
     */
    class ComponentAnimator extends FudgeCore.Component {
        constructor(_animation = new FudgeCore.Animation(""), _playmode = ANIMATION_PLAYMODE.LOOP, _playback = ANIMATION_PLAYBACK.TIMEBASED_CONTINOUS) {
            super();
            this.speedScalesWithGlobalSpeed = true;
            this.speedScale = 1;
            this.lastTime = 0;
            this.animation = _animation;
            this.playmode = _playmode;
            this.playback = _playback;
            this.localTime = new FudgeCore.Time();
            //TODO: update animation total time when loading a different animation?
            this.animation.calculateTotalTime();
            FudgeCore.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.updateAnimationLoop.bind(this));
            FudgeCore.Time.game.addEventListener("timeScaled" /* TIME_SCALED */, this.updateScale.bind(this));
        }
        set speed(_s) {
            this.speedScale = _s;
            this.updateScale();
        }
        /**
         * Jumps to a certain time in the animation to play from there.
         * @param _time The time to jump to
         */
        jumpTo(_time) {
            this.localTime.set(_time);
            this.lastTime = _time;
            _time = _time % this.animation.totalTime;
            let mutator = this.animation.getMutated(_time, this.calculateDirection(_time), this.playback);
            this.getContainer().applyAnimation(mutator);
        }
        /**
         * Returns the current time of the animation, modulated for animation length.
         */
        getCurrentTime() {
            return this.localTime.get() % this.animation.totalTime;
        }
        /**
         * Forces an update of the animation from outside. Used in the ViewAnimation. Shouldn't be used during the game.
         * @param _time the (unscaled) time to update the animation with.
         * @returns a Tupel containing the Mutator for Animation and the playmode corrected time.
         */
        updateAnimation(_time) {
            return this.updateAnimationLoop(null, _time);
        }
        //#region transfer
        serialize() {
            let s = super.serialize();
            s["animation"] = this.animation.serialize();
            s["playmode"] = this.playmode;
            s["playback"] = this.playback;
            s["speedScale"] = this.speedScale;
            s["speedScalesWithGlobalSpeed"] = this.speedScalesWithGlobalSpeed;
            s[super.constructor.name] = super.serialize();
            return s;
        }
        deserialize(_s) {
            this.animation = new FudgeCore.Animation("");
            this.animation.deserialize(_s.animation);
            this.playback = _s.playback;
            this.playmode = _s.playmode;
            this.speedScale = _s.speedScale;
            this.speedScalesWithGlobalSpeed = _s.speedScalesWithGlobalSpeed;
            super.deserialize(_s[super.constructor.name]);
            return this;
        }
        //#endregion
        //#region updateAnimation
        /**
         * Updates the Animation.
         * Gets called every time the Loop fires the LOOP_FRAME Event.
         * Uses the built-in time unless a different time is specified.
         * May also be called from updateAnimation().
         */
        updateAnimationLoop(_e, _time) {
            if (this.animation.totalTime == 0)
                return [null, 0];
            let time = _time || this.localTime.get();
            if (this.playback == ANIMATION_PLAYBACK.FRAMEBASED) {
                time = this.lastTime + (1000 / this.animation.fps);
            }
            let direction = this.calculateDirection(time);
            time = this.applyPlaymodes(time);
            this.executeEvents(this.animation.getEventsToFire(this.lastTime, time, this.playback, direction));
            if (this.lastTime != time) {
                this.lastTime = time;
                time = time % this.animation.totalTime;
                let mutator = this.animation.getMutated(time, direction, this.playback);
                if (this.getContainer()) {
                    this.getContainer().applyAnimation(mutator);
                }
                return [mutator, time];
            }
            return [null, time];
        }
        /**
         * Fires all custom events the Animation should have fired between the last frame and the current frame.
         * @param events a list of names of custom events to fire
         */
        executeEvents(events) {
            for (let i = 0; i < events.length; i++) {
                this.dispatchEvent(new Event(events[i]));
            }
        }
        /**
         * Calculates the actual time to use, using the current playmodes.
         * @param _time the time to apply the playmodes to
         * @returns the recalculated time
         */
        applyPlaymodes(_time) {
            switch (this.playmode) {
                case ANIMATION_PLAYMODE.STOP:
                    return this.localTime.getOffset();
                case ANIMATION_PLAYMODE.PLAYONCE:
                    if (_time >= this.animation.totalTime)
                        return this.animation.totalTime - 0.01; //TODO: this might cause some issues
                    else
                        return _time;
                case ANIMATION_PLAYMODE.PLAYONCESTOPAFTER:
                    if (_time >= this.animation.totalTime)
                        return this.animation.totalTime + 0.01; //TODO: this might cause some issues
                    else
                        return _time;
                default:
                    return _time;
            }
        }
        /**
         * Calculates and returns the direction the animation should currently be playing in.
         * @param _time the time at which to calculate the direction
         * @returns 1 if forward, 0 if stop, -1 if backwards
         */
        calculateDirection(_time) {
            switch (this.playmode) {
                case ANIMATION_PLAYMODE.STOP:
                    return 0;
                // case ANIMATION_PLAYMODE.PINGPONG:
                //   if (Math.floor(_time / this.animation.totalTime) % 2 == 0)
                //     return 1;
                //   else
                //     return -1;
                case ANIMATION_PLAYMODE.REVERSELOOP:
                    return -1;
                case ANIMATION_PLAYMODE.PLAYONCE:
                case ANIMATION_PLAYMODE.PLAYONCESTOPAFTER:
                    if (_time >= this.animation.totalTime) {
                        return 0;
                    }
                default:
                    return 1;
            }
        }
        /**
         * Updates the scale of the animation if the user changes it or if the global game timer changed its scale.
         */
        updateScale() {
            let newScale = this.speedScale;
            if (this.speedScalesWithGlobalSpeed)
                newScale *= FudgeCore.Time.game.getScale();
            this.localTime.setScale(newScale);
        }
    }
    FudgeCore.ComponentAnimator = ComponentAnimator;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a [[ComponentAudio]] to a [[Node]].
     * Only a single [[Audio]] can be used within a single [[ComponentAudio]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class ComponentAudio extends FudgeCore.Component {
        /**
         * Create Component Audio for
         * @param _audio
         */
        constructor(_audio, _audioOscillator) {
            super();
            this.isLocalised = false;
            this.isFiltered = false;
            this.isDelayed = false;
            this.singleton = false;
            if (_audio) {
                this.setAudio(_audio);
            }
        }
        /**
         * set AudioFilter in ComponentAudio
         * @param _filter AudioFilter
         */
        setFilter(_filter) {
            this.filter = _filter;
            this.isFiltered = true;
        }
        getFilter() {
            return this.filter;
        }
        setDelay(_delay) {
            this.delay = _delay;
            this.isDelayed = true;
        }
        getDelay() {
            return this.delay;
        }
        setLocalisation(_localisation) {
            this.localisation = _localisation;
            this.isLocalised = true;
        }
        getLocalisation() {
            return this.localisation;
        }
        /**
         * Play Audio at current time of AudioContext
         */
        playAudio(_audioSettings, _offset, _duration) {
            this.audio.initBufferSource(_audioSettings);
            this.connectAudioNodes(_audioSettings);
            this.audio.getBufferSourceNode().start(_audioSettings.getAudioContext().currentTime, _offset, _duration);
        }
        /**
         * Adds an [[Audio]] to the [[ComponentAudio]]
         * @param _audio Audio Data as [[Audio]]
         */
        setAudio(_audio) {
            this.audio = _audio;
        }
        getAudio() {
            return this.audio;
        }
        //#region Transfer
        serialize() {
            let serialization = {
                isFiltered: this.isFiltered,
                isDelayed: this.isDelayed,
                isLocalised: this.isLocalised,
                audio: this.audio,
                filter: this.filter,
                delay: this.delay,
                localisation: this.localisation
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.isFiltered = _serialization.isFiltered;
            this.isDelayed = _serialization.isDelayed;
            this.isLocalised = _serialization.isLocalised;
            this.audio = _serialization.audio;
            this.filter = _serialization.filter;
            this.delay = _serialization.delay;
            return this;
        }
        reduceMutator(_mutator) {
            delete this.audio;
            delete this.filter;
            delete this.delay;
            delete this.localisation;
        }
        //#endregion
        /**
         * Final attachments for the Audio Nodes in following order.
         * This method needs to be called whenever there is a change of parts in the [[ComponentAudio]].
         * 1. Local Gain
         * 2. Localisation
         * 3. Filter
         * 4. Delay
         * 5. Master Gain
         */
        connectAudioNodes(_audioSettings) {
            const bufferSource = this.audio.getBufferSourceNode();
            const lGain = this.audio.getLocalGain();
            let panner;
            let filt;
            let delay;
            const mGain = _audioSettings.masterGain;
            console.log("-------------------------------");
            console.log("Connecting Properties for Audio");
            console.log("-------------------------------");
            bufferSource.connect(lGain);
            if (this.isLocalised && this.localisation != null) {
                console.log("Connect Localisation");
                panner = this.localisation.pannerNode;
                lGain.connect(panner);
                if (this.isFiltered && this.filter != null) {
                    console.log("Connect Filter");
                    filt = this.filter.audioFilter;
                    panner.connect(filt);
                    if (this.isDelayed && this.delay != null) {
                        console.log("Connect Delay");
                        delay = this.delay.audioDelay;
                        filt.connect(delay);
                        console.log("Connect Master Gain");
                        delay.connect(mGain);
                    }
                    else {
                        console.log("Connect Master Gain");
                        filt.connect(mGain);
                    }
                }
                else {
                    if (this.isDelayed && this.delay != null) {
                        console.log("Connect Delay");
                        delay = this.delay.audioDelay;
                        panner.connect(delay);
                        console.log("Connect Master Gain");
                        delay.connect(mGain);
                    }
                    else {
                        console.log("Connect Master Gain");
                        panner.connect(mGain);
                    }
                }
            }
            else if (this.isFiltered && this.filter != null) {
                console.log("Connect Filter");
                filt = this.filter.audioFilter;
                lGain.connect(filt);
                if (this.isDelayed && this.delay != null) {
                    console.log("Connect Delay");
                    delay = this.delay.audioDelay;
                    filt.connect(delay);
                    console.log("Connect Master Gain");
                    delay.connect(mGain);
                }
                else {
                    console.log("Connect Master Gain");
                    filt.connect(mGain);
                }
            }
            else if (this.isDelayed && this.delay != null) {
                console.log("Connect Delay");
                delay = this.delay.audioDelay;
                lGain.connect(delay);
                console.log("Connect Master Gain");
                delay.connect(mGain);
            }
            else {
                console.log("Connect Only Master Gain");
                lGain.connect(mGain);
            }
            console.log("-------------------------------");
        }
    }
    FudgeCore.ComponentAudio = ComponentAudio;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches an [[AudioListener]] to the node
     * @authors Thomas Dorner, HFU, 2019
     */
    class ComponentAudioListener extends FudgeCore.Component {
        /**
         * Constructor of the AudioListener class
         * @param _audioContext Audio Context from AudioSessionData
         */
        constructor(_audioSettings) {
            super();
            this.audioListener = _audioSettings.getAudioContext().listener;
        }
        setAudioListener(_audioSettings) {
            this.audioListener = _audioSettings.getAudioContext().listener;
        }
        getAudioListener() {
            return this.audioListener;
        }
        /**
         * We will call setAudioListenerPosition whenever there is a need to change Positions.
         * All the position values should be identical to the current Position this is attached to.
         *
         *     __|___
         *    |  |  |
         *    |  °--|--
         *    |/____|
         *   /
         *
         */
        setListenerPosition(_position) {
            this.positionBase = _position;
            this.audioListener.positionX.value = this.positionBase.x;
            this.audioListener.positionY.value = -this.positionBase.z;
            this.audioListener.positionZ.value = this.positionBase.y;
            console.log("Set Listener Position: X: " + this.audioListener.positionX.value + " | Y: " + this.audioListener.positionY.value + " | Z: " + this.audioListener.positionZ.value);
        }
        getListenerPosition() {
            return this.positionBase;
        }
        /**
         * FUDGE SYSTEM
         *
         *      UP (Y)
         *       ^
         *     __|___
         *    |  |  |
         *    |  O--|--> FORWARD (Z)
         *    |_____|
         */
        setListenerPositionForward(_position) {
            this.positionFW = _position;
            //Set forward looking position of the AudioListener
            this.audioListener.forwardX.value = this.positionFW.x;
            this.audioListener.forwardY.value = -this.positionFW.z + 1;
            this.audioListener.forwardZ.value = this.positionFW.y;
        }
        getListenerPositionForward() {
            return this.positionFW;
        }
        /**
         *      UP (Z)
         *       ^
         *     __|___
         *    |  |  |
         *    |  O--|--> FORWARD (X)
         *    |_____|
         */
        setListenerPostitionUp(_position) {
            this.positionUP = _position;
            //Set upward looking position of the AudioListener
            this.audioListener.upX.value = this.positionUP.x;
            this.audioListener.upY.value = -this.positionUP.z;
            this.audioListener.upZ.value = this.positionUP.y + 1;
        }
        getListenerPositionUp() {
            return this.positionUP;
        }
        /**
         * Set all positional Values based on a single Position
         * @param _position position of the Object
         */
        updatePositions(_position /*, _positionForward: Vector3, _positionUp: Vector3*/) {
            this.setListenerPosition(_position);
            this.setListenerPositionForward(_position);
            this.setListenerPostitionUp(_position);
        }
        /**
         * Show all Settings inside of [[ComponentAudioListener]].
         * Method only for Debugging Purposes.
         */
        showListenerSettings() {
            console.log("------------------------------");
            console.log("Show all Settings of Listener");
            console.log("------------------------------");
            console.log("Listener Position Base: X: " + this.audioListener.positionX.value + " | Y: " + this.audioListener.positionY.value + " | Z: " + this.audioListener.positionZ.value);
            console.log("Listener Position Up: X: " + this.audioListener.upX.value + " | Y: " + this.audioListener.upY.value + " | Z: " + this.audioListener.upZ.value);
            console.log("Listener Position Forward: X: " + this.audioListener.forwardX.value + " | Y: " + this.audioListener.forwardY.value + " | Z: " + this.audioListener.forwardZ.value);
            console.log("------------------------------");
        }
        //#region Transfer
        serialize() {
            let serialization = {
                audioListener: this.audioListener,
                posBase: this.positionBase,
                posFW: this.positionFW,
                posUP: this.positionUP
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.audioListener = _serialization.audioListener;
            this.positionBase = _serialization.posBase;
            this.positionFW = _serialization.posFW;
            this.positionUP = _serialization.posUP;
            return this;
        }
        reduceMutator(_mutator) {
            delete this.audioListener;
            delete this.positionBase;
            delete this.positionFW;
            delete this.positionUP;
        }
    }
    FudgeCore.ComponentAudioListener = ComponentAudioListener;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="Component.ts"/>
var FudgeCore;
/// <reference path="Component.ts"/>
(function (FudgeCore) {
    let FIELD_OF_VIEW;
    (function (FIELD_OF_VIEW) {
        FIELD_OF_VIEW[FIELD_OF_VIEW["HORIZONTAL"] = 0] = "HORIZONTAL";
        FIELD_OF_VIEW[FIELD_OF_VIEW["VERTICAL"] = 1] = "VERTICAL";
        FIELD_OF_VIEW[FIELD_OF_VIEW["DIAGONAL"] = 2] = "DIAGONAL";
    })(FIELD_OF_VIEW = FudgeCore.FIELD_OF_VIEW || (FudgeCore.FIELD_OF_VIEW = {}));
    /**
     * Defines identifiers for the various projections a camera can provide.
     * TODO: change back to number enum if strings not needed
     */
    let PROJECTION;
    (function (PROJECTION) {
        PROJECTION["CENTRAL"] = "central";
        PROJECTION["ORTHOGRAPHIC"] = "orthographic";
        PROJECTION["DIMETRIC"] = "dimetric";
        PROJECTION["STEREO"] = "stereo";
    })(PROJECTION = FudgeCore.PROJECTION || (FudgeCore.PROJECTION = {}));
    /**
     * The camera component holds the projection-matrix and other data needed to render a scene from the perspective of the node it is attached to.
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentCamera extends FudgeCore.Component {
        constructor() {
            super(...arguments);
            this.pivot = FudgeCore.Matrix4x4.IDENTITY;
            this.backgroundColor = new FudgeCore.Color(0, 0, 0, 1); // The color of the background the camera will render.
            //private orthographic: boolean = false; // Determines whether the image will be rendered with perspective or orthographic projection.
            this.projection = PROJECTION.CENTRAL;
            this.transform = new FudgeCore.Matrix4x4; // The matrix to multiply each scene objects transformation by, to determine where it will be drawn.
            this.fieldOfView = 45; // The camera's sensorangle.
            this.aspectRatio = 1.0;
            this.direction = FIELD_OF_VIEW.DIAGONAL;
            this.backgroundEnabled = true; // Determines whether or not the background of this camera will be rendered.
            //#endregion
        }
        // TODO: examine, if background should be an attribute of Camera or Viewport
        getProjection() {
            return this.projection;
        }
        getBackgroundEnabled() {
            return this.backgroundEnabled;
        }
        getAspect() {
            return this.aspectRatio;
        }
        getFieldOfView() {
            return this.fieldOfView;
        }
        getDirection() {
            return this.direction;
        }
        /**
         * Returns the multiplikation of the worldtransformation of the camera container with the projection matrix
         * @returns the world-projection-matrix
         */
        get ViewProjectionMatrix() {
            let world = this.pivot;
            try {
                world = FudgeCore.Matrix4x4.MULTIPLICATION(this.getContainer().mtxWorld, this.pivot);
            }
            catch (_error) {
                // no container node or no world transformation found -> continue with pivot only
            }
            let viewMatrix = FudgeCore.Matrix4x4.INVERSION(world);
            return FudgeCore.Matrix4x4.MULTIPLICATION(this.transform, viewMatrix);
        }
        /**
         * Set the camera to perspective projection. The world origin is in the center of the canvaselement.
         * @param _aspect The aspect ratio between width and height of projectionspace.(Default = canvas.clientWidth / canvas.ClientHeight)
         * @param _fieldOfView The field of view in Degrees. (Default = 45)
         * @param _direction The plane on which the fieldOfView-Angle is given
         */
        projectCentral(_aspect = this.aspectRatio, _fieldOfView = this.fieldOfView, _direction = this.direction) {
            this.aspectRatio = _aspect;
            this.fieldOfView = _fieldOfView;
            this.direction = _direction;
            this.projection = PROJECTION.CENTRAL;
            this.transform = FudgeCore.Matrix4x4.PROJECTION_CENTRAL(_aspect, this.fieldOfView, 1, 2000, this.direction); // TODO: remove magic numbers
        }
        /**
         * Set the camera to orthographic projection. The origin is in the top left corner of the canvas.
         * @param _left The positionvalue of the projectionspace's left border. (Default = 0)
         * @param _right The positionvalue of the projectionspace's right border. (Default = canvas.clientWidth)
         * @param _bottom The positionvalue of the projectionspace's bottom border.(Default = canvas.clientHeight)
         * @param _top The positionvalue of the projectionspace's top border.(Default = 0)
         */
        projectOrthographic(_left = 0, _right = FudgeCore.RenderManager.getCanvas().clientWidth, _bottom = FudgeCore.RenderManager.getCanvas().clientHeight, _top = 0) {
            this.projection = PROJECTION.ORTHOGRAPHIC;
            this.transform = FudgeCore.Matrix4x4.PROJECTION_ORTHOGRAPHIC(_left, _right, _bottom, _top, 400, -400); // TODO: examine magic numbers!
        }
        /**
         * Return the calculated normed dimension of the projection space
         */
        getProjectionRectangle() {
            let tanFov = Math.tan(Math.PI * this.fieldOfView / 360); // Half of the angle, to calculate dimension from the center -> right angle
            let tanHorizontal = 0;
            let tanVertical = 0;
            if (this.direction == FIELD_OF_VIEW.DIAGONAL) {
                let aspect = Math.sqrt(this.aspectRatio);
                tanHorizontal = tanFov * aspect;
                tanVertical = tanFov / aspect;
            }
            else if (this.direction == FIELD_OF_VIEW.VERTICAL) {
                tanVertical = tanFov;
                tanHorizontal = tanVertical * this.aspectRatio;
            }
            else { //FOV_DIRECTION.HORIZONTAL
                tanHorizontal = tanFov;
                tanVertical = tanHorizontal / this.aspectRatio;
            }
            return FudgeCore.Rectangle.GET(0, 0, tanHorizontal * 2, tanVertical * 2);
        }
        //#region Transfer
        serialize() {
            let serialization = {
                backgroundColor: this.backgroundColor,
                backgroundEnabled: this.backgroundEnabled,
                projection: this.projection,
                fieldOfView: this.fieldOfView,
                direction: this.direction,
                aspect: this.aspectRatio,
                pivot: this.pivot.serialize(),
                [super.constructor.name]: super.serialize()
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.backgroundColor = _serialization.backgroundColor;
            this.backgroundEnabled = _serialization.backgroundEnabled;
            this.projection = _serialization.projection;
            this.fieldOfView = _serialization.fieldOfView;
            this.aspectRatio = _serialization.aspect;
            this.direction = _serialization.direction;
            this.pivot.deserialize(_serialization.pivot);
            super.deserialize(_serialization[super.constructor.name]);
            switch (this.projection) {
                case PROJECTION.ORTHOGRAPHIC:
                    this.projectOrthographic(); // TODO: serialize and deserialize parameters
                    break;
                case PROJECTION.CENTRAL:
                    this.projectCentral();
                    break;
            }
            return this;
        }
        getMutatorAttributeTypes(_mutator) {
            let types = super.getMutatorAttributeTypes(_mutator);
            if (types.direction)
                types.direction = FIELD_OF_VIEW;
            if (types.projection)
                types.projection = PROJECTION;
            return types;
        }
        mutate(_mutator) {
            super.mutate(_mutator);
            switch (this.projection) {
                case PROJECTION.CENTRAL:
                    this.projectCentral(this.aspectRatio, this.fieldOfView, this.direction);
                    break;
            }
        }
        reduceMutator(_mutator) {
            delete _mutator.transform;
            super.reduceMutator(_mutator);
        }
    }
    FudgeCore.ComponentCamera = ComponentCamera;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Baseclass for different kinds of lights.
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Light extends FudgeCore.Mutable {
        constructor(_color = new FudgeCore.Color(1, 1, 1, 1)) {
            super();
            this.color = _color;
        }
        getType() {
            return this.constructor;
        }
        reduceMutator() { }
    }
    FudgeCore.Light = Light;
    /**
     * Ambient light, coming from all directions, illuminating everything with its color independent of position and orientation (like a foggy day or in the shades)
     * ```plaintext
     * ~ ~ ~
     *  ~ ~ ~
     * ```
     */
    class LightAmbient extends Light {
        constructor(_color = new FudgeCore.Color(1, 1, 1, 1)) {
            super(_color);
        }
    }
    FudgeCore.LightAmbient = LightAmbient;
    /**
     * Directional light, illuminating everything from a specified direction with its color (like standing in bright sunlight)
     * ```plaintext
     * --->
     * --->
     * --->
     * ```
     */
    class LightDirectional extends Light {
        constructor(_color = new FudgeCore.Color(1, 1, 1, 1)) {
            super(_color);
        }
    }
    FudgeCore.LightDirectional = LightDirectional;
    /**
     * Omnidirectional light emitting from its position, illuminating objects depending on their position and distance with its color (like a colored light bulb)
     * ```plaintext
     *         .\|/.
     *        -- o --
     *         ´/|\`
     * ```
     */
    class LightPoint extends Light {
        constructor() {
            super(...arguments);
            this.range = 10;
        }
    }
    FudgeCore.LightPoint = LightPoint;
    /**
     * Spot light emitting within a specified angle from its position, illuminating objects depending on their position and distance with its color
     * ```plaintext
     *          o
     *         /|\
     *        / | \
     * ```
     */
    class LightSpot extends Light {
    }
    FudgeCore.LightSpot = LightSpot;
})(FudgeCore || (FudgeCore = {}));
///<reference path="../Light/Light.ts"/>
var FudgeCore;
///<reference path="../Light/Light.ts"/>
(function (FudgeCore) {
    /**
     * Attaches a [[Light]] to the node
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    /**
     * Defines identifiers for the various types of light this component can provide.
     */
    // export enum LIGHT_TYPE {
    //     AMBIENT = "ambient",
    //     DIRECTIONAL = "directional",
    //     POINT = "point",
    //     SPOT = "spot"
    // }
    class ComponentLight extends FudgeCore.Component {
        constructor(_light = new FudgeCore.LightAmbient()) {
            super();
            // private static constructors: { [type: string]: General } = { [LIGHT_TYPE.AMBIENT]: LightAmbient, [LIGHT_TYPE.DIRECTIONAL]: LightDirectional, [LIGHT_TYPE.POINT]: LightPoint, [LIGHT_TYPE.SPOT]: LightSpot };
            this.pivot = FudgeCore.Matrix4x4.IDENTITY;
            this.light = null;
            this.singleton = false;
            this.light = _light;
        }
        setType(_class) {
            let mtrOld = {};
            if (this.light)
                mtrOld = this.light.getMutator();
            this.light = new _class();
            this.light.mutate(mtrOld);
        }
    }
    FudgeCore.ComponentLight = ComponentLight;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a [[Material]] to the node
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentMaterial extends FudgeCore.Component {
        constructor(_material = null) {
            super();
            this.material = _material;
        }
        //#region Transfer
        serialize() {
            let serialization;
            /* at this point of time, serialization as resource and as inline object is possible. TODO: check if inline becomes obsolete */
            let idMaterial = this.material.idResource;
            if (idMaterial)
                serialization = { idMaterial: idMaterial };
            else
                serialization = { material: FudgeCore.Serializer.serialize(this.material) };
            serialization[super.constructor.name] = super.serialize();
            return serialization;
        }
        deserialize(_serialization) {
            let material;
            if (_serialization.idMaterial)
                material = FudgeCore.ResourceManager.get(_serialization.idMaterial);
            else
                material = FudgeCore.Serializer.deserialize(_serialization.material);
            this.material = material;
            super.deserialize(_serialization[super.constructor.name]);
            return this;
        }
    }
    FudgeCore.ComponentMaterial = ComponentMaterial;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a [[Mesh]] to the node
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentMesh extends FudgeCore.Component {
        constructor(_mesh = null) {
            super();
            this.pivot = FudgeCore.Matrix4x4.IDENTITY;
            this.mesh = null;
            this.mesh = _mesh;
        }
        //#region Transfer
        serialize() {
            let serialization;
            /* at this point of time, serialization as resource and as inline object is possible. TODO: check if inline becomes obsolete */
            let idMesh = this.mesh.idResource;
            if (idMesh)
                serialization = { idMesh: idMesh };
            else
                serialization = { mesh: FudgeCore.Serializer.serialize(this.mesh) };
            serialization.pivot = this.pivot.serialize();
            serialization[super.constructor.name] = super.serialize();
            return serialization;
        }
        deserialize(_serialization) {
            let mesh;
            if (_serialization.idMesh)
                mesh = FudgeCore.ResourceManager.get(_serialization.idMesh);
            else
                mesh = FudgeCore.Serializer.deserialize(_serialization.mesh);
            this.mesh = mesh;
            this.pivot.deserialize(_serialization.pivot);
            super.deserialize(_serialization[super.constructor.name]);
            return this;
        }
    }
    FudgeCore.ComponentMesh = ComponentMesh;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Base class for scripts the user writes
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentScript extends FudgeCore.Component {
        constructor() {
            super();
            this.singleton = false;
        }
        serialize() {
            return this.getMutator();
        }
        deserialize(_serialization) {
            this.mutate(_serialization);
            return this;
        }
    }
    FudgeCore.ComponentScript = ComponentScript;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a transform-[[Matrix4x4]] to the node, moving, scaling and rotating it in space relative to its parent.
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentTransform extends FudgeCore.Component {
        constructor(_matrix = FudgeCore.Matrix4x4.IDENTITY) {
            super();
            this.local = _matrix;
        }
        //#region Transfer
        serialize() {
            let serialization = {
                local: this.local.serialize(),
                [super.constructor.name]: super.serialize()
            };
            return serialization;
        }
        deserialize(_serialization) {
            super.deserialize(_serialization[super.constructor.name]);
            this.local.deserialize(_serialization.local);
            return this;
        }
        // public mutate(_mutator: Mutator): void {
        //     this.local.mutate(_mutator);
        // }
        // public getMutator(): Mutator { 
        //     return this.local.getMutator();
        // }
        // public getMutatorAttributeTypes(_mutator: Mutator): MutatorAttributeTypes {
        //     let types: MutatorAttributeTypes = this.local.getMutatorAttributeTypes(_mutator);
        //     return types;
        // }
        reduceMutator(_mutator) {
            delete _mutator.world;
            super.reduceMutator(_mutator);
        }
    }
    FudgeCore.ComponentTransform = ComponentTransform;
})(FudgeCore || (FudgeCore = {}));
// <reference path="DebugAlert.ts"/>
var FudgeCore;
// <reference path="DebugAlert.ts"/>
(function (FudgeCore) {
    /**
     * The filters corresponding to debug activities, more to come
     */
    let DEBUG_FILTER;
    (function (DEBUG_FILTER) {
        DEBUG_FILTER[DEBUG_FILTER["NONE"] = 0] = "NONE";
        DEBUG_FILTER[DEBUG_FILTER["INFO"] = 1] = "INFO";
        DEBUG_FILTER[DEBUG_FILTER["LOG"] = 2] = "LOG";
        DEBUG_FILTER[DEBUG_FILTER["WARN"] = 4] = "WARN";
        DEBUG_FILTER[DEBUG_FILTER["ERROR"] = 8] = "ERROR";
        DEBUG_FILTER[DEBUG_FILTER["ALL"] = 15] = "ALL";
    })(DEBUG_FILTER = FudgeCore.DEBUG_FILTER || (FudgeCore.DEBUG_FILTER = {}));
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Base class for the different DebugTargets, mainly for technical purpose of inheritance
     */
    class DebugTarget {
        static mergeArguments(_message, ..._args) {
            let out = JSON.stringify(_message);
            for (let arg of _args)
                out += "\n" + JSON.stringify(arg, null, 2);
            return out;
        }
    }
    FudgeCore.DebugTarget = DebugTarget;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugTarget.ts"/>
var FudgeCore;
/// <reference path="DebugTarget.ts"/>
(function (FudgeCore) {
    /**
     * Routing to the alert box
     */
    class DebugAlert extends FudgeCore.DebugTarget {
        static createDelegate(_headline) {
            let delegate = function (_message, ..._args) {
                let out = _headline + "\n\n" + FudgeCore.DebugTarget.mergeArguments(_message, ..._args);
                alert(out);
            };
            return delegate;
        }
    }
    DebugAlert.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: DebugAlert.createDelegate("Info"),
        [FudgeCore.DEBUG_FILTER.LOG]: DebugAlert.createDelegate("Log"),
        [FudgeCore.DEBUG_FILTER.WARN]: DebugAlert.createDelegate("Warn"),
        [FudgeCore.DEBUG_FILTER.ERROR]: DebugAlert.createDelegate("Error")
    };
    FudgeCore.DebugAlert = DebugAlert;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugTarget.ts"/>
var FudgeCore;
/// <reference path="DebugTarget.ts"/>
(function (FudgeCore) {
    /**
     * Routing to the standard-console
     */
    class DebugConsole extends FudgeCore.DebugTarget {
    }
    DebugConsole.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: console.info,
        [FudgeCore.DEBUG_FILTER.LOG]: console.log,
        [FudgeCore.DEBUG_FILTER.WARN]: console.warn,
        [FudgeCore.DEBUG_FILTER.ERROR]: console.error
    };
    FudgeCore.DebugConsole = DebugConsole;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugInterfaces.ts"/>
/// <reference path="DebugAlert.ts"/>
/// <reference path="DebugConsole.ts"/>
var FudgeCore;
/// <reference path="DebugInterfaces.ts"/>
/// <reference path="DebugAlert.ts"/>
/// <reference path="DebugConsole.ts"/>
(function (FudgeCore) {
    /**
     * The Debug-Class offers functions known from the console-object and additions,
     * routing the information to various [[DebugTargets]] that can be easily defined by the developers and registerd by users
     */
    class Debug {
        /**
         * De- / Activate a filter for the given DebugTarget.
         * @param _target
         * @param _filter
         */
        static setFilter(_target, _filter) {
            for (let filter in Debug.delegates)
                Debug.delegates[filter].delete(_target);
            for (let filter in FudgeCore.DEBUG_FILTER) {
                let parsed = parseInt(filter);
                if (parsed == FudgeCore.DEBUG_FILTER.ALL)
                    break;
                if (_filter & parsed)
                    Debug.delegates[parsed].set(_target, _target.delegates[parsed]);
            }
        }
        /**
         * Debug function to be implemented by the DebugTarget.
         * info(...) displays additional information with low priority
         * @param _message
         * @param _args
         */
        static info(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.INFO, _message, _args);
        }
        /**
         * Debug function to be implemented by the DebugTarget.
         * log(...) displays information with medium priority
         * @param _message
         * @param _args
         */
        static log(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.LOG, _message, _args);
        }
        /**
         * Debug function to be implemented by the DebugTarget.
         * warn(...) displays information about non-conformities in usage, which is emphasized e.g. by color
         * @param _message
         * @param _args
         */
        static warn(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.WARN, _message, _args);
        }
        /**
         * Debug function to be implemented by the DebugTarget.
         * error(...) displays critical information about failures, which is emphasized e.g. by color
         * @param _message
         * @param _args
         */
        static error(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.ERROR, _message, _args);
        }
        /**
         * Lookup all delegates registered to the filter and call them using the given arguments
         * @param _filter
         * @param _message
         * @param _args
         */
        static delegate(_filter, _message, _args) {
            let delegates = Debug.delegates[_filter];
            for (let delegate of delegates.values())
                if (_args.length > 0)
                    delegate(_message, ..._args);
                else
                    delegate(_message);
        }
    }
    /**
     * For each set filter, this associative array keeps references to the registered delegate functions of the chosen [[DebugTargets]]
     */
    // TODO: implement anonymous function setting up all filters
    Debug.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.INFO]]]),
        [FudgeCore.DEBUG_FILTER.LOG]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.LOG]]]),
        [FudgeCore.DEBUG_FILTER.WARN]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.WARN]]]),
        [FudgeCore.DEBUG_FILTER.ERROR]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.ERROR]]])
    };
    FudgeCore.Debug = Debug;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugTarget.ts"/>
var FudgeCore;
/// <reference path="DebugTarget.ts"/>
(function (FudgeCore) {
    /**
     * Routing to a HTMLDialogElement
     */
    class DebugDialog extends FudgeCore.DebugTarget {
    }
    FudgeCore.DebugDialog = DebugDialog;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugTarget.ts"/>
var FudgeCore;
/// <reference path="DebugTarget.ts"/>
(function (FudgeCore) {
    /**
     * Route to an HTMLTextArea, may be obsolete when using HTMLDialogElement
     */
    class DebugTextArea extends FudgeCore.DebugTarget {
        static createDelegate(_headline) {
            let delegate = function (_message, ..._args) {
                let out = _headline + "\n\n" + FudgeCore.DebugTarget.mergeArguments(_message, _args);
                DebugTextArea.textArea.textContent += out;
            };
            return delegate;
        }
    }
    DebugTextArea.textArea = document.createElement("textarea");
    DebugTextArea.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: FudgeCore.DebugAlert.createDelegate("Info")
    };
    FudgeCore.DebugTextArea = DebugTextArea;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    let COLOR;
    (function (COLOR) {
        COLOR[COLOR["BLACK"] = 0] = "BLACK";
        COLOR[COLOR["WHITE"] = 1] = "WHITE";
        COLOR[COLOR["RED"] = 2] = "RED";
        COLOR[COLOR["GREEN"] = 3] = "GREEN";
        COLOR[COLOR["BLUE"] = 4] = "BLUE";
        COLOR[COLOR["YELLOW"] = 5] = "YELLOW";
        COLOR[COLOR["CYAN"] = 6] = "CYAN";
        COLOR[COLOR["MAGENTA"] = 7] = "MAGENTA";
        COLOR[COLOR["LIGHT_GREY"] = 8] = "LIGHT_GREY";
        COLOR[COLOR["LIGHT_RED"] = 9] = "LIGHT_RED";
        COLOR[COLOR["LIGHT_GREEN"] = 10] = "LIGHT_GREEN";
        COLOR[COLOR["LIGHT_BLUE"] = 11] = "LIGHT_BLUE";
        COLOR[COLOR["LIGHT_YELLOW"] = 12] = "LIGHT_YELLOW";
        COLOR[COLOR["LIGHT_CYAN"] = 13] = "LIGHT_CYAN";
        COLOR[COLOR["LIGHT_MAGENTA"] = 14] = "LIGHT_MAGENTA";
        COLOR[COLOR["DARK_GREY"] = 15] = "DARK_GREY";
        COLOR[COLOR["DARK_RED"] = 16] = "DARK_RED";
        COLOR[COLOR["DARK_GREEN"] = 17] = "DARK_GREEN";
        COLOR[COLOR["DARK_BLUE"] = 18] = "DARK_BLUE";
        COLOR[COLOR["DARK_YELLOW"] = 19] = "DARK_YELLOW";
        COLOR[COLOR["DARK_CYAN"] = 20] = "DARK_CYAN";
        COLOR[COLOR["DARK_MAGENTA"] = 21] = "DARK_MAGENTA";
    })(COLOR = FudgeCore.COLOR || (FudgeCore.COLOR = {}));
    /**
     * Defines a color as values in the range of 0 to 1 for the four channels red, green, blue and alpha (for opacity)
     */
    class Color extends FudgeCore.Mutable {
        constructor(_r = 1, _g = 1, _b = 1, _a = 1) {
            super();
            this.setNormRGBA(_r, _g, _b, _a);
        }
        static get BLACK() { return new Color(0, 0, 0, 1); }
        static get WHITE() { return new Color(1, 1, 1, 1); }
        static get RED() { return new Color(1, 0, 0, 1); }
        static get GREEN() { return new Color(0, 1, 0, 1); }
        static get BLUE() { return new Color(0, 0, 1, 1); }
        static get YELLOW() { return new Color(1, 1, 0, 1); }
        static get CYAN() { return new Color(0, 1, 1, 1); }
        static get MAGENTA() { return new Color(1, 0, 1, 1); }
        static get GREY() { return new Color(0.5, 0.5, 0.5, 1); }
        static get LIGHT_GREY() { return new Color(0.75, 0.75, 0.75, 1); }
        static get LIGHT_RED() { return new Color(1, 0.5, 0.5, 1); }
        static get LIGHT_GREEN() { return new Color(0.5, 1, 0.5, 1); }
        static get LIGHT_BLUE() { return new Color(0.5, 0.5, 1, 1); }
        static get LIGHT_YELLOW() { return new Color(1, 1, 0.5, 1); }
        static get LIGHT_CYAN() { return new Color(0.5, 1, 1, 1); }
        static get LIGHT_MAGENTA() { return new Color(1, 0.5, 1, 1); }
        static get DARK_GREY() { return new Color(0.25, 0.25, 0.25, 1); }
        static get DARK_RED() { return new Color(0.5, 0, 0, 1); }
        static get DARK_GREEN() { return new Color(0, 0.5, 0, 1); }
        static get DARK_BLUE() { return new Color(0, 0, 0.5, 1); }
        static get DARK_YELLOW() { return new Color(0.5, 0.5, 0, 1); }
        static get DARK_CYAN() { return new Color(0, 0.5, 0.5, 1); }
        static get DARK_MAGENTA() { return new Color(0.5, 0, 0.5, 1); }
        static PRESET(_color) {
            // TODO: replace above getters with switch here... Reason: it's more like an enum and should be documented as such
            return new Color(1, 1, 1, 1);
        }
        setNormRGBA(_r, _g, _b, _a) {
            this.r = Math.min(1, Math.max(0, _r));
            this.g = Math.min(1, Math.max(0, _g));
            this.b = Math.min(1, Math.max(0, _b));
            this.a = Math.min(1, Math.max(0, _a));
        }
        setBytesRGBA(_r, _g, _b, _a) {
            this.setNormRGBA(_r / 255, _g / 255, _b / 255, _a / 255);
        }
        getArray() {
            return new Float32Array([this.r, this.g, this.b, this.a]);
        }
        setArrayNormRGBA(_color) {
            this.setNormRGBA(_color[0], _color[1], _color[2], _color[3]);
        }
        setArrayBytesRGBA(_color) {
            this.setBytesRGBA(_color[0], _color[1], _color[2], _color[3]);
        }
        add(_color) {
            this.r += _color.r;
            this.g += _color.g;
            this.b += _color.b;
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Color = Color;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Baseclass for materials. Combines a [[Shader]] with a compatible [[Coat]]
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Material {
        constructor(_name, _shader, _coat) {
            this.idResource = undefined;
            this.name = _name;
            this.shaderType = _shader;
            if (_shader) {
                if (_coat)
                    this.setCoat(_coat);
                else
                    this.setCoat(this.createCoatMatchingShader());
            }
        }
        /**
         * Creates a new [[Coat]] instance that is valid for the [[Shader]] referenced by this material
         */
        createCoatMatchingShader() {
            let coat = new (this.shaderType.getCoat())();
            return coat;
        }
        /**
         * Makes this material reference the given [[Coat]] if it is compatible with the referenced [[Shader]]
         * @param _coat
         */
        setCoat(_coat) {
            if (_coat.constructor != this.shaderType.getCoat())
                throw (new Error("Shader and coat don't match"));
            this.coat = _coat;
        }
        /**
         * Returns the currently referenced [[Coat]] instance
         */
        getCoat() {
            return this.coat;
        }
        /**
         * Changes the materials reference to the given [[Shader]], creates and references a new [[Coat]] instance
         * and mutates the new coat to preserve matching properties.
         * @param _shaderType
         */
        setShader(_shaderType) {
            this.shaderType = _shaderType;
            let coat = this.createCoatMatchingShader();
            coat.mutate(this.coat.getMutator());
            this.setCoat(coat);
        }
        /**
         * Returns the [[Shader]] referenced by this material
         */
        getShader() {
            return this.shaderType;
        }
        //#region Transfer
        // TODO: this type of serialization was implemented for implicit Material create. Check if obsolete when only one material class exists and/or materials are stored separately
        serialize() {
            let serialization = {
                name: this.name,
                idResource: this.idResource,
                shader: this.shaderType.name,
                coat: FudgeCore.Serializer.serialize(this.coat)
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.name = _serialization.name;
            this.idResource = _serialization.idResource;
            // TODO: provide for shaders in the users namespace. See Serializer fullpath etc.
            // tslint:disable-next-line: no-any
            this.shaderType = FudgeCore[_serialization.shader];
            let coat = FudgeCore.Serializer.deserialize(_serialization.coat);
            this.setCoat(coat);
            return this;
        }
    }
    FudgeCore.Material = Material;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Keeps a depot of objects that have been marked for reuse, sorted by type.
     * Using [[Recycler]] reduces load on the carbage collector and thus supports smooth performance
     */
    class Recycler {
        /**
         * Returns an object of the requested type from the depot, or a new one, if the depot was empty
         * @param _T The class identifier of the desired object
         */
        static get(_T) {
            let key = _T.name;
            let instances = Recycler.depot[key];
            if (instances && instances.length > 0)
                return instances.pop();
            else
                return new _T();
        }
        /**
         * Stores the object in the depot for later recycling. Users are responsible for throwing in objects that are about to loose scope and are not referenced by any other
         * @param _instance
         */
        static store(_instance) {
            let key = _instance.constructor.name;
            //Debug.log(key);
            let instances = Recycler.depot[key] || [];
            instances.push(_instance);
            Recycler.depot[key] = instances;
            // Debug.log(`ObjectManager.depot[${key}]: ${ObjectManager.depot[key].length}`);
            //Debug.log(this.depot);
        }
        /**
         * Emptys the depot of a given type, leaving the objects for the garbage collector. May result in a short stall when many objects were in
         * @param _T
         */
        static dump(_T) {
            let key = _T.name;
            Recycler.depot[key] = [];
        }
        /**
         * Emptys all depots, leaving all objects to the garbage collector. May result in a short stall when many objects were in
         */
        static dumpAll() {
            Recycler.depot = {};
        }
    }
    Recycler.depot = {};
    FudgeCore.Recycler = Recycler;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Static class handling the resources used with the current FUDGE-instance.
     * Keeps a list of the resources and generates ids to retrieve them.
     * Resources are objects referenced multiple times but supposed to be stored only once
     */
    class ResourceManager {
        /**
         * Generates an id for the resources and registers it with the list of resources
         * @param _resource
         */
        static register(_resource) {
            if (!_resource.idResource)
                _resource.idResource = ResourceManager.generateId(_resource);
            ResourceManager.resources[_resource.idResource] = _resource;
        }
        /**
         * Generate a user readable and unique id using the type of the resource, the date and random numbers
         * @param _resource
         */
        static generateId(_resource) {
            // TODO: build id and integrate info from resource, not just date
            let idResource;
            do
                idResource = _resource.constructor.name + "|" + new Date().toISOString() + "|" + Math.random().toPrecision(5).substr(2, 5);
            while (ResourceManager.resources[idResource]);
            return idResource;
        }
        /**
         * Tests, if an object is a [[SerializableResource]]
         * @param _object The object to examine
         */
        static isResource(_object) {
            return (Reflect.has(_object, "idResource"));
        }
        /**
         * Retrieves the resource stored with the given id
         * @param _idResource
         */
        static get(_idResource) {
            let resource = ResourceManager.resources[_idResource];
            if (!resource) {
                let serialization = ResourceManager.serialization[_idResource];
                if (!serialization) {
                    FudgeCore.Debug.error("Resource not found", _idResource);
                    return null;
                }
                resource = ResourceManager.deserializeResource(serialization);
            }
            return resource;
        }
        /**
         * Creates and registers a resource from a [[Node]], copying the complete branch starting with it
         * @param _node A node to create the resource from
         * @param _replaceWithInstance if true (default), the node used as origin is replaced by a [[NodeResourceInstance]] of the [[NodeResource]] created
         */
        static registerNodeAsResource(_node, _replaceWithInstance = true) {
            let serialization = _node.serialize();
            let nodeResource = new FudgeCore.NodeResource("NodeResource");
            nodeResource.deserialize(serialization);
            ResourceManager.register(nodeResource);
            if (_replaceWithInstance && _node.getParent()) {
                let instance = new FudgeCore.NodeResourceInstance(nodeResource);
                _node.getParent().replaceChild(_node, instance);
            }
            return nodeResource;
        }
        /**
         * Serialize all resources
         */
        static serialize() {
            let serialization = {};
            for (let idResource in ResourceManager.resources) {
                let resource = ResourceManager.resources[idResource];
                if (idResource != resource.idResource)
                    FudgeCore.Debug.error("Resource-id mismatch", resource);
                serialization[idResource] = FudgeCore.Serializer.serialize(resource);
            }
            return serialization;
        }
        /**
         * Create resources from a serialization, deleting all resources previously registered
         * @param _serialization
         */
        static deserialize(_serialization) {
            ResourceManager.serialization = _serialization;
            ResourceManager.resources = {};
            for (let idResource in _serialization) {
                let serialization = _serialization[idResource];
                let resource = ResourceManager.deserializeResource(serialization);
                if (resource)
                    ResourceManager.resources[idResource] = resource;
            }
            return ResourceManager.resources;
        }
        static deserializeResource(_serialization) {
            return FudgeCore.Serializer.deserialize(_serialization);
        }
    }
    ResourceManager.resources = {};
    ResourceManager.serialization = null;
    FudgeCore.ResourceManager = ResourceManager;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Light/Light.ts"/>
/// <reference path="../Event/Event.ts"/>
/// <reference path="../Component/ComponentLight.ts"/>
var FudgeCore;
/// <reference path="../Light/Light.ts"/>
/// <reference path="../Event/Event.ts"/>
/// <reference path="../Component/ComponentLight.ts"/>
(function (FudgeCore) {
    /**
     * Controls the rendering of a branch of a scenetree, using the given [[ComponentCamera]],
     * and the propagation of the rendered image from the offscreen renderbuffer to the target canvas
     * through a series of [[Framing]] objects. The stages involved are in order of rendering
     * [[RenderManager]].viewport -> [[Viewport]].source -> [[Viewport]].destination -> DOM-Canvas -> Client(CSS)
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Viewport extends FudgeCore.EventTargetƒ {
        constructor() {
            super(...arguments);
            this.name = "Viewport"; // The name to call this viewport by.
            this.camera = null; // The camera representing the view parameters to render the branch.
            // TODO: verify if client to canvas should be in Viewport or somewhere else (Window, Container?)
            // Multiple viewports using the same canvas shouldn't differ here...
            // different framing methods can be used, this is the default
            this.frameClientToCanvas = new FudgeCore.FramingScaled();
            this.frameCanvasToDestination = new FudgeCore.FramingComplex();
            this.frameDestinationToSource = new FudgeCore.FramingScaled();
            this.frameSourceToRender = new FudgeCore.FramingScaled();
            this.adjustingFrames = true;
            this.adjustingCamera = true;
            this.lights = null;
            this.branch = null; // The first node in the tree(branch) that will be rendered.
            this.crc2 = null;
            this.canvas = null;
            this.pickBuffers = [];
            /**
             * Handle drag-drop events and dispatch to viewport as FUDGE-Event
             */
            this.hndDragDropEvent = (_event) => {
                let _dragevent = _event;
                switch (_dragevent.type) {
                    case "dragover":
                    case "drop":
                        _dragevent.preventDefault();
                        _dragevent.dataTransfer.effectAllowed = "none";
                        break;
                    case "dragstart":
                        // just dummy data,  valid data should be set in handler registered by the user
                        _dragevent.dataTransfer.setData("text", "Hallo");
                        // TODO: check if there is a better solution to hide the ghost image of the draggable object
                        _dragevent.dataTransfer.setDragImage(new Image(), 0, 0);
                        break;
                }
                let event = new FudgeCore.DragDropEventƒ("ƒ" + _event.type, _dragevent);
                this.addCanvasPosition(event);
                this.dispatchEvent(event);
            };
            /**
             * Handle pointer events and dispatch to viewport as FUDGE-Event
             */
            this.hndPointerEvent = (_event) => {
                let event = new FudgeCore.PointerEventƒ("ƒ" + _event.type, _event);
                this.addCanvasPosition(event);
                this.dispatchEvent(event);
            };
            /**
             * Handle keyboard events and dispatch to viewport as FUDGE-Event, if the viewport has the focus
             */
            this.hndKeyboardEvent = (_event) => {
                if (!this.hasFocus)
                    return;
                let event = new FudgeCore.KeyboardEventƒ("ƒ" + _event.type, _event);
                this.dispatchEvent(event);
            };
            /**
             * Handle wheel event and dispatch to viewport as FUDGE-Event
             */
            this.hndWheelEvent = (_event) => {
                let event = new FudgeCore.WheelEventƒ("ƒ" + _event.type, _event);
                this.dispatchEvent(event);
            };
        }
        /**
         * Connects the viewport to the given canvas to render the given branch to using the given camera-component, and names the viewport as given.
         * @param _name
         * @param _branch
         * @param _camera
         * @param _canvas
         */
        initialize(_name, _branch, _camera, _canvas) {
            this.name = _name;
            this.camera = _camera;
            this.canvas = _canvas;
            this.crc2 = _canvas.getContext("2d");
            this.rectSource = FudgeCore.RenderManager.getCanvasRect();
            this.rectDestination = this.getClientRectangle();
            this.setBranch(_branch);
        }
        /**
         * Retrieve the 2D-context attached to the destination canvas
         */
        getContext() {
            return this.crc2;
        }
        /**
         * Retrieve the size of the destination canvas as a rectangle, x and y are always 0
         */
        getCanvasRectangle() {
            return FudgeCore.Rectangle.GET(0, 0, this.canvas.width, this.canvas.height);
        }
        /**
         * Retrieve the client rectangle the canvas is displayed and fit in, x and y are always 0
         */
        getClientRectangle() {
            return FudgeCore.Rectangle.GET(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
        }
        /**
         * Set the branch to be drawn in the viewport.
         */
        setBranch(_branch) {
            if (this.branch) {
                this.branch.removeEventListener("componentAdd" /* COMPONENT_ADD */, this.hndComponentEvent);
                this.branch.removeEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndComponentEvent);
            }
            this.branch = _branch;
            this.collectLights();
            this.branch.addEventListener("componentAdd" /* COMPONENT_ADD */, this.hndComponentEvent);
            this.branch.addEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndComponentEvent);
        }
        /**
         * Logs this viewports scenegraph to the console.
         */
        showSceneGraph() {
            // TODO: move to debug-class
            let output = "SceneGraph for this viewport:";
            output += "\n \n";
            output += this.branch.name;
            FudgeCore.Debug.log(output + "   => ROOTNODE" + this.createSceneGraph(this.branch));
        }
        // #region Drawing
        /**
         * Draw this viewport
         */
        draw() {
            FudgeCore.RenderManager.resetFrameBuffer();
            if (!this.camera.isActive)
                return;
            if (this.adjustingFrames)
                this.adjustFrames();
            if (this.adjustingCamera)
                this.adjustCamera();
            FudgeCore.RenderManager.clear(this.camera.backgroundColor);
            if (FudgeCore.RenderManager.addBranch(this.branch))
                // branch has not yet been processed fully by rendermanager -> update all registered nodes
                FudgeCore.RenderManager.update();
            FudgeCore.RenderManager.setLights(this.lights);
            FudgeCore.RenderManager.drawBranch(this.branch, this.camera);
            this.crc2.imageSmoothingEnabled = false;
            this.crc2.drawImage(FudgeCore.RenderManager.getCanvas(), this.rectSource.x, this.rectSource.y, this.rectSource.width, this.rectSource.height, this.rectDestination.x, this.rectDestination.y, this.rectDestination.width, this.rectDestination.height);
        }
        /**
        * Draw this viewport for RayCast
        */
        createPickBuffers() {
            if (this.adjustingFrames)
                this.adjustFrames();
            if (this.adjustingCamera)
                this.adjustCamera();
            if (FudgeCore.RenderManager.addBranch(this.branch))
                // branch has not yet been processed fully by rendermanager -> update all registered nodes
                FudgeCore.RenderManager.update();
            this.pickBuffers = FudgeCore.RenderManager.drawBranchForRayCast(this.branch, this.camera);
            this.crc2.imageSmoothingEnabled = false;
            this.crc2.drawImage(FudgeCore.RenderManager.getCanvas(), this.rectSource.x, this.rectSource.y, this.rectSource.width, this.rectSource.height, this.rectDestination.x, this.rectDestination.y, this.rectDestination.width, this.rectDestination.height);
        }
        pickNodeAt(_pos) {
            // this.createPickBuffers();
            let hits = FudgeCore.RenderManager.pickNodeAt(_pos, this.pickBuffers, this.rectSource);
            hits.sort((a, b) => (b.zBuffer > 0) ? (a.zBuffer > 0) ? a.zBuffer - b.zBuffer : 1 : -1);
            return hits;
        }
        /**
         * Adjust all frames involved in the rendering process from the display area in the client up to the renderer canvas
         */
        adjustFrames() {
            // get the rectangle of the canvas area as displayed (consider css)
            let rectClient = this.getClientRectangle();
            // adjust the canvas size according to the given framing applied to client
            let rectCanvas = this.frameClientToCanvas.getRect(rectClient);
            this.canvas.width = rectCanvas.width;
            this.canvas.height = rectCanvas.height;
            // adjust the destination area on the target-canvas to render to by applying the framing to canvas
            this.rectDestination = this.frameCanvasToDestination.getRect(rectCanvas);
            // adjust the area on the source-canvas to render from by applying the framing to destination area
            this.rectSource = this.frameDestinationToSource.getRect(this.rectDestination);
            // having an offset source does make sense only when multiple viewports display parts of the same rendering. For now: shift it to 0,0
            this.rectSource.x = this.rectSource.y = 0;
            // still, a partial image of the rendering may be retrieved by moving and resizing the render viewport
            let rectRender = this.frameSourceToRender.getRect(this.rectSource);
            FudgeCore.RenderManager.setViewportRectangle(rectRender);
            // no more transformation after this for now, offscreen canvas and render-viewport have the same size
            FudgeCore.RenderManager.setCanvasSize(rectRender.width, rectRender.height);
        }
        /**
         * Adjust the camera parameters to fit the rendering into the render vieport
         */
        adjustCamera() {
            let rect = FudgeCore.RenderManager.getViewportRectangle();
            this.camera.projectCentral(rect.width / rect.height, this.camera.getFieldOfView());
        }
        // #endregion
        //#region Points
        pointClientToSource(_client) {
            let result;
            let rect;
            rect = this.getClientRectangle();
            result = this.frameClientToCanvas.getPoint(_client, rect);
            rect = this.getCanvasRectangle();
            result = this.frameCanvasToDestination.getPoint(result, rect);
            result = this.frameDestinationToSource.getPoint(result, this.rectSource);
            //TODO: when Source, Render and RenderViewport deviate, continue transformation 
            return result;
        }
        pointSourceToRender(_source) {
            let projectionRectangle = this.camera.getProjectionRectangle();
            let point = this.frameSourceToRender.getPoint(_source, projectionRectangle);
            return point;
        }
        pointClientToRender(_client) {
            let point = this.pointClientToSource(_client);
            point = this.pointSourceToRender(point);
            //TODO: when Render and RenderViewport deviate, continue transformation 
            return point;
        }
        //#endregion
        // #region Events (passing from canvas to viewport and from there into branch)
        /**
         * Returns true if this viewport currently has focus and thus receives keyboard events
         */
        get hasFocus() {
            return (Viewport.focus == this);
        }
        /**
         * Switch the viewports focus on or off. Only one viewport in one FUDGE instance can have the focus, thus receiving keyboard events.
         * So a viewport currently having the focus will lose it, when another one receives it. The viewports fire [[Event]]s accordingly.
         *
         * @param _on
         */
        setFocus(_on) {
            if (_on) {
                if (Viewport.focus == this)
                    return;
                if (Viewport.focus)
                    Viewport.focus.dispatchEvent(new Event("focusout" /* FOCUS_OUT */));
                Viewport.focus = this;
                this.dispatchEvent(new Event("focusin" /* FOCUS_IN */));
            }
            else {
                if (Viewport.focus != this)
                    return;
                this.dispatchEvent(new Event("focusout" /* FOCUS_OUT */));
                Viewport.focus = null;
            }
        }
        /**
         * De- / Activates the given pointer event to be propagated into the viewport as FUDGE-Event
         * @param _type
         * @param _on
         */
        activatePointerEvent(_type, _on) {
            this.activateEvent(this.canvas, _type, this.hndPointerEvent, _on);
        }
        /**
         * De- / Activates the given keyboard event to be propagated into the viewport as FUDGE-Event
         * @param _type
         * @param _on
         */
        activateKeyboardEvent(_type, _on) {
            this.activateEvent(this.canvas.ownerDocument, _type, this.hndKeyboardEvent, _on);
        }
        /**
         * De- / Activates the given drag-drop event to be propagated into the viewport as FUDGE-Event
         * @param _type
         * @param _on
         */
        activateDragDropEvent(_type, _on) {
            if (_type == "\u0192dragstart" /* START */)
                this.canvas.draggable = _on;
            this.activateEvent(this.canvas, _type, this.hndDragDropEvent, _on);
        }
        /**
         * De- / Activates the wheel event to be propagated into the viewport as FUDGE-Event
         * @param _type
         * @param _on
         */
        activateWheelEvent(_type, _on) {
            this.activateEvent(this.canvas, _type, this.hndWheelEvent, _on);
        }
        /**
         * Add position of the pointer mapped to canvas-coordinates as canvasX, canvasY to the event
         * @param event
         */
        addCanvasPosition(event) {
            event.canvasX = this.canvas.width * event.pointerX / event.clientRect.width;
            event.canvasY = this.canvas.height * event.pointerY / event.clientRect.height;
        }
        activateEvent(_target, _type, _handler, _on) {
            _type = _type.slice(1); // chip the ƒlorentin
            if (_on)
                _target.addEventListener(_type, _handler);
            else
                _target.removeEventListener(_type, _handler);
        }
        hndComponentEvent(_event) {
            FudgeCore.Debug.log(_event);
        }
        // #endregion
        /**
         * Collect all lights in the branch to pass to shaders
         */
        collectLights() {
            // TODO: make private
            this.lights = new Map();
            for (let node of this.branch.branch) {
                let cmpLights = node.getComponents(FudgeCore.ComponentLight);
                for (let cmpLight of cmpLights) {
                    let type = cmpLight.light.getType();
                    let lightsOfType = this.lights.get(type);
                    if (!lightsOfType) {
                        lightsOfType = [];
                        this.lights.set(type, lightsOfType);
                    }
                    lightsOfType.push(cmpLight);
                }
            }
        }
        /**
         * Creates an outputstring as visual representation of this viewports scenegraph. Called for the passed node and recursive for all its children.
         * @param _fudgeNode The node to create a scenegraphentry for.
         */
        createSceneGraph(_fudgeNode) {
            // TODO: move to debug-class
            let output = "";
            for (let name in _fudgeNode.getChildren()) {
                let child = _fudgeNode.getChildren()[name];
                output += "\n";
                let current = child;
                if (current.getParent() && current.getParent().getParent())
                    output += "|";
                while (current.getParent() && current.getParent().getParent()) {
                    output += "   ";
                    current = current.getParent();
                }
                output += "'--";
                output += child.name;
                output += this.createSceneGraph(child);
            }
            return output;
        }
    }
    FudgeCore.Viewport = Viewport;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class KeyboardEventƒ extends KeyboardEvent {
        constructor(type, _event) {
            super(type, _event);
        }
    }
    FudgeCore.KeyboardEventƒ = KeyboardEventƒ;
    /**
     * The codes sent from a standard english keyboard layout
     */
    let KEYBOARD_CODE;
    (function (KEYBOARD_CODE) {
        KEYBOARD_CODE["A"] = "KeyA";
        KEYBOARD_CODE["B"] = "KeyB";
        KEYBOARD_CODE["C"] = "KeyC";
        KEYBOARD_CODE["D"] = "KeyD";
        KEYBOARD_CODE["E"] = "KeyE";
        KEYBOARD_CODE["F"] = "KeyF";
        KEYBOARD_CODE["G"] = "KeyG";
        KEYBOARD_CODE["H"] = "KeyH";
        KEYBOARD_CODE["I"] = "KeyI";
        KEYBOARD_CODE["J"] = "KeyJ";
        KEYBOARD_CODE["K"] = "KeyK";
        KEYBOARD_CODE["L"] = "KeyL";
        KEYBOARD_CODE["M"] = "KeyM";
        KEYBOARD_CODE["N"] = "KeyN";
        KEYBOARD_CODE["O"] = "KeyO";
        KEYBOARD_CODE["P"] = "KeyP";
        KEYBOARD_CODE["Q"] = "KeyQ";
        KEYBOARD_CODE["R"] = "KeyR";
        KEYBOARD_CODE["S"] = "KeyS";
        KEYBOARD_CODE["T"] = "KeyT";
        KEYBOARD_CODE["U"] = "KeyU";
        KEYBOARD_CODE["V"] = "KeyV";
        KEYBOARD_CODE["W"] = "KeyW";
        KEYBOARD_CODE["X"] = "KeyX";
        KEYBOARD_CODE["Y"] = "KeyY";
        KEYBOARD_CODE["Z"] = "KeyZ";
        KEYBOARD_CODE["ESC"] = "Escape";
        KEYBOARD_CODE["ZERO"] = "Digit0";
        KEYBOARD_CODE["ONE"] = "Digit1";
        KEYBOARD_CODE["TWO"] = "Digit2";
        KEYBOARD_CODE["THREE"] = "Digit3";
        KEYBOARD_CODE["FOUR"] = "Digit4";
        KEYBOARD_CODE["FIVE"] = "Digit5";
        KEYBOARD_CODE["SIX"] = "Digit6";
        KEYBOARD_CODE["SEVEN"] = "Digit7";
        KEYBOARD_CODE["EIGHT"] = "Digit8";
        KEYBOARD_CODE["NINE"] = "Digit9";
        KEYBOARD_CODE["MINUS"] = "Minus";
        KEYBOARD_CODE["EQUAL"] = "Equal";
        KEYBOARD_CODE["BACKSPACE"] = "Backspace";
        KEYBOARD_CODE["TABULATOR"] = "Tab";
        KEYBOARD_CODE["BRACKET_LEFT"] = "BracketLeft";
        KEYBOARD_CODE["BRACKET_RIGHT"] = "BracketRight";
        KEYBOARD_CODE["ENTER"] = "Enter";
        KEYBOARD_CODE["CTRL_LEFT"] = "ControlLeft";
        KEYBOARD_CODE["SEMICOLON"] = "Semicolon";
        KEYBOARD_CODE["QUOTE"] = "Quote";
        KEYBOARD_CODE["BACK_QUOTE"] = "Backquote";
        KEYBOARD_CODE["SHIFT_LEFT"] = "ShiftLeft";
        KEYBOARD_CODE["BACKSLASH"] = "Backslash";
        KEYBOARD_CODE["COMMA"] = "Comma";
        KEYBOARD_CODE["PERIOD"] = "Period";
        KEYBOARD_CODE["SLASH"] = "Slash";
        KEYBOARD_CODE["SHIFT_RIGHT"] = "ShiftRight";
        KEYBOARD_CODE["NUMPAD_MULTIPLY"] = "NumpadMultiply";
        KEYBOARD_CODE["ALT_LEFT"] = "AltLeft";
        KEYBOARD_CODE["SPACE"] = "Space";
        KEYBOARD_CODE["CAPS_LOCK"] = "CapsLock";
        KEYBOARD_CODE["F1"] = "F1";
        KEYBOARD_CODE["F2"] = "F2";
        KEYBOARD_CODE["F3"] = "F3";
        KEYBOARD_CODE["F4"] = "F4";
        KEYBOARD_CODE["F5"] = "F5";
        KEYBOARD_CODE["F6"] = "F6";
        KEYBOARD_CODE["F7"] = "F7";
        KEYBOARD_CODE["F8"] = "F8";
        KEYBOARD_CODE["F9"] = "F9";
        KEYBOARD_CODE["F10"] = "F10";
        KEYBOARD_CODE["PAUSE"] = "Pause";
        KEYBOARD_CODE["SCROLL_LOCK"] = "ScrollLock";
        KEYBOARD_CODE["NUMPAD7"] = "Numpad7";
        KEYBOARD_CODE["NUMPAD8"] = "Numpad8";
        KEYBOARD_CODE["NUMPAD9"] = "Numpad9";
        KEYBOARD_CODE["NUMPAD_SUBTRACT"] = "NumpadSubtract";
        KEYBOARD_CODE["NUMPAD4"] = "Numpad4";
        KEYBOARD_CODE["NUMPAD5"] = "Numpad5";
        KEYBOARD_CODE["NUMPAD6"] = "Numpad6";
        KEYBOARD_CODE["NUMPAD_ADD"] = "NumpadAdd";
        KEYBOARD_CODE["NUMPAD1"] = "Numpad1";
        KEYBOARD_CODE["NUMPAD2"] = "Numpad2";
        KEYBOARD_CODE["NUMPAD3"] = "Numpad3";
        KEYBOARD_CODE["NUMPAD0"] = "Numpad0";
        KEYBOARD_CODE["NUMPAD_DECIMAL"] = "NumpadDecimal";
        KEYBOARD_CODE["PRINT_SCREEN"] = "PrintScreen";
        KEYBOARD_CODE["INTL_BACK_SLASH"] = "IntlBackSlash";
        KEYBOARD_CODE["F11"] = "F11";
        KEYBOARD_CODE["F12"] = "F12";
        KEYBOARD_CODE["NUMPAD_EQUAL"] = "NumpadEqual";
        KEYBOARD_CODE["F13"] = "F13";
        KEYBOARD_CODE["F14"] = "F14";
        KEYBOARD_CODE["F15"] = "F15";
        KEYBOARD_CODE["F16"] = "F16";
        KEYBOARD_CODE["F17"] = "F17";
        KEYBOARD_CODE["F18"] = "F18";
        KEYBOARD_CODE["F19"] = "F19";
        KEYBOARD_CODE["F20"] = "F20";
        KEYBOARD_CODE["F21"] = "F21";
        KEYBOARD_CODE["F22"] = "F22";
        KEYBOARD_CODE["F23"] = "F23";
        KEYBOARD_CODE["F24"] = "F24";
        KEYBOARD_CODE["KANA_MODE"] = "KanaMode";
        KEYBOARD_CODE["LANG2"] = "Lang2";
        KEYBOARD_CODE["LANG1"] = "Lang1";
        KEYBOARD_CODE["INTL_RO"] = "IntlRo";
        KEYBOARD_CODE["CONVERT"] = "Convert";
        KEYBOARD_CODE["NON_CONVERT"] = "NonConvert";
        KEYBOARD_CODE["INTL_YEN"] = "IntlYen";
        KEYBOARD_CODE["NUMPAD_COMMA"] = "NumpadComma";
        KEYBOARD_CODE["UNDO"] = "Undo";
        KEYBOARD_CODE["PASTE"] = "Paste";
        KEYBOARD_CODE["MEDIA_TRACK_PREVIOUS"] = "MediaTrackPrevious";
        KEYBOARD_CODE["CUT"] = "Cut";
        KEYBOARD_CODE["COPY"] = "Copy";
        KEYBOARD_CODE["MEDIA_TRACK_NEXT"] = "MediaTrackNext";
        KEYBOARD_CODE["NUMPAD_ENTER"] = "NumpadEnter";
        KEYBOARD_CODE["CTRL_RIGHT"] = "ControlRight";
        KEYBOARD_CODE["AUDIO_VOLUME_MUTE"] = "AudioVolumeMute";
        KEYBOARD_CODE["LAUNCH_APP2"] = "LaunchApp2";
        KEYBOARD_CODE["MEDIA_PLAY_PAUSE"] = "MediaPlayPause";
        KEYBOARD_CODE["MEDIA_STOP"] = "MediaStop";
        KEYBOARD_CODE["EJECT"] = "Eject";
        KEYBOARD_CODE["AUDIO_VOLUME_DOWN"] = "AudioVolumeDown";
        KEYBOARD_CODE["VOLUME_DOWN"] = "VolumeDown";
        KEYBOARD_CODE["AUDIO_VOLUME_UP"] = "AudioVolumeUp";
        KEYBOARD_CODE["VOLUME_UP"] = "VolumeUp";
        KEYBOARD_CODE["BROWSER_HOME"] = "BrowserHome";
        KEYBOARD_CODE["NUMPAD_DIVIDE"] = "NumpadDivide";
        KEYBOARD_CODE["ALT_RIGHT"] = "AltRight";
        KEYBOARD_CODE["HELP"] = "Help";
        KEYBOARD_CODE["NUM_LOCK"] = "NumLock";
        KEYBOARD_CODE["HOME"] = "Home";
        KEYBOARD_CODE["ARROW_UP"] = "ArrowUp";
        KEYBOARD_CODE["ARROW_RIGHT"] = "ArrowRight";
        KEYBOARD_CODE["ARROW_DOWN"] = "ArrowDown";
        KEYBOARD_CODE["ARROW_LEFT"] = "ArrowLeft";
        KEYBOARD_CODE["END"] = "End";
        KEYBOARD_CODE["PAGE_UP"] = "PageUp";
        KEYBOARD_CODE["PAGE_DOWN"] = "PageDown";
        KEYBOARD_CODE["INSERT"] = "Insert";
        KEYBOARD_CODE["DELETE"] = "Delete";
        KEYBOARD_CODE["META_LEFT"] = "Meta_Left";
        KEYBOARD_CODE["OS_LEFT"] = "OSLeft";
        KEYBOARD_CODE["META_RIGHT"] = "MetaRight";
        KEYBOARD_CODE["OS_RIGHT"] = "OSRight";
        KEYBOARD_CODE["CONTEXT_MENU"] = "ContextMenu";
        KEYBOARD_CODE["POWER"] = "Power";
        KEYBOARD_CODE["BROWSER_SEARCH"] = "BrowserSearch";
        KEYBOARD_CODE["BROWSER_FAVORITES"] = "BrowserFavorites";
        KEYBOARD_CODE["BROWSER_REFRESH"] = "BrowserRefresh";
        KEYBOARD_CODE["BROWSER_STOP"] = "BrowserStop";
        KEYBOARD_CODE["BROWSER_FORWARD"] = "BrowserForward";
        KEYBOARD_CODE["BROWSER_BACK"] = "BrowserBack";
        KEYBOARD_CODE["LAUNCH_APP1"] = "LaunchApp1";
        KEYBOARD_CODE["LAUNCH_MAIL"] = "LaunchMail";
        KEYBOARD_CODE["LAUNCH_MEDIA_PLAYER"] = "LaunchMediaPlayer";
        //mac brings this buttton
        KEYBOARD_CODE["FN"] = "Fn";
        //Linux brings these
        KEYBOARD_CODE["AGAIN"] = "Again";
        KEYBOARD_CODE["PROPS"] = "Props";
        KEYBOARD_CODE["SELECT"] = "Select";
        KEYBOARD_CODE["OPEN"] = "Open";
        KEYBOARD_CODE["FIND"] = "Find";
        KEYBOARD_CODE["WAKE_UP"] = "WakeUp";
        KEYBOARD_CODE["NUMPAD_PARENT_LEFT"] = "NumpadParentLeft";
        KEYBOARD_CODE["NUMPAD_PARENT_RIGHT"] = "NumpadParentRight";
        //android
        KEYBOARD_CODE["SLEEP"] = "Sleep";
    })(KEYBOARD_CODE = FudgeCore.KEYBOARD_CODE || (FudgeCore.KEYBOARD_CODE = {}));
    /*
    Firefox can't make use of those buttons and Combinations:
    SINGELE_BUTTONS:
     Druck,
    COMBINATIONS:
     Shift + F10, Shift + Numpad5,
     CTRL + q, CTRL + F4,
     ALT + F1, ALT + F2, ALT + F3, ALT + F7, ALT + F8, ALT + F10
    Opera won't do good with these Buttons and combinations:
    SINGLE_BUTTONS:
     Float32Array, F11, ALT,
    COMBINATIONS:
     CTRL + q, CTRL + t, CTRL + h, CTRL + g, CTRL + n, CTRL + f
     ALT + F1, ALT + F2, ALT + F4, ALT + F5, ALT + F6, ALT + F7, ALT + F8, ALT + F10
     */
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Framing describes how to map a rectangle into a given frame
     * and how points in the frame correspond to points in the resulting rectangle
     */
    class Framing extends FudgeCore.Mutable {
        reduceMutator(_mutator) { }
    }
    FudgeCore.Framing = Framing;
    /**
     * The resulting rectangle has a fixed width and height and display should scale to fit the frame
     * Points are scaled in the same ratio
     */
    class FramingFixed extends Framing {
        constructor() {
            super(...arguments);
            this.width = 300;
            this.height = 150;
        }
        setSize(_width, _height) {
            this.width = _width;
            this.height = _height;
        }
        getPoint(_pointInFrame, _rectFrame) {
            let result = new FudgeCore.Vector2(this.width * (_pointInFrame.x - _rectFrame.x) / _rectFrame.width, this.height * (_pointInFrame.y - _rectFrame.y) / _rectFrame.height);
            return result;
        }
        getPointInverse(_point, _rect) {
            let result = new FudgeCore.Vector2(_point.x * _rect.width / this.width + _rect.x, _point.y * _rect.height / this.height + _rect.y);
            return result;
        }
        getRect(_rectFrame) {
            return FudgeCore.Rectangle.GET(0, 0, this.width, this.height);
        }
    }
    FudgeCore.FramingFixed = FramingFixed;
    /**
     * Width and height of the resulting rectangle are fractions of those of the frame, scaled by normed values normWidth and normHeight.
     * Display should scale to fit the frame and points are scaled in the same ratio
     */
    class FramingScaled extends Framing {
        constructor() {
            super(...arguments);
            this.normWidth = 1.0;
            this.normHeight = 1.0;
        }
        setScale(_normWidth, _normHeight) {
            this.normWidth = _normWidth;
            this.normHeight = _normHeight;
        }
        getPoint(_pointInFrame, _rectFrame) {
            let result = new FudgeCore.Vector2(this.normWidth * (_pointInFrame.x - _rectFrame.x), this.normHeight * (_pointInFrame.y - _rectFrame.y));
            return result;
        }
        getPointInverse(_point, _rect) {
            let result = new FudgeCore.Vector2(_point.x / this.normWidth + _rect.x, _point.y / this.normHeight + _rect.y);
            return result;
        }
        getRect(_rectFrame) {
            return FudgeCore.Rectangle.GET(0, 0, this.normWidth * _rectFrame.width, this.normHeight * _rectFrame.height);
        }
    }
    FudgeCore.FramingScaled = FramingScaled;
    /**
     * The resulting rectangle fits into a margin given as fractions of the size of the frame given by normAnchor
     * plus an absolute padding given by pixelBorder. Display should fit into this.
     */
    class FramingComplex extends Framing {
        constructor() {
            super(...arguments);
            this.margin = { left: 0, top: 0, right: 0, bottom: 0 };
            this.padding = { left: 0, top: 0, right: 0, bottom: 0 };
        }
        getPoint(_pointInFrame, _rectFrame) {
            let result = new FudgeCore.Vector2(_pointInFrame.x - this.padding.left - this.margin.left * _rectFrame.width, _pointInFrame.y - this.padding.top - this.margin.top * _rectFrame.height);
            return result;
        }
        getPointInverse(_point, _rect) {
            let result = new FudgeCore.Vector2(_point.x + this.padding.left + this.margin.left * _rect.width, _point.y + this.padding.top + this.margin.top * _rect.height);
            return result;
        }
        getRect(_rectFrame) {
            if (!_rectFrame)
                return null;
            let minX = _rectFrame.x + this.margin.left * _rectFrame.width + this.padding.left;
            let minY = _rectFrame.y + this.margin.top * _rectFrame.height + this.padding.top;
            let maxX = _rectFrame.x + (1 - this.margin.right) * _rectFrame.width - this.padding.right;
            let maxY = _rectFrame.y + (1 - this.margin.bottom) * _rectFrame.height - this.padding.bottom;
            return FudgeCore.Rectangle.GET(minX, minY, maxX - minX, maxY - minY);
        }
        getMutator() {
            return { margin: this.margin, padding: this.padding };
        }
    }
    FudgeCore.FramingComplex = FramingComplex;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Simple class for 3x3 matrix operations (This class can only handle 2D
     * transformations. Could be removed after applying full 2D compatibility to Mat4).
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Matrix3x3 {
        constructor() {
            this.data = [
                1, 0, 0,
                0, 1, 0,
                0, 0, 1
            ];
        }
        static projection(_width, _height) {
            let matrix = new Matrix3x3;
            matrix.data = [
                2 / _width, 0, 0,
                0, -2 / _height, 0,
                -1, 1, 1
            ];
            return matrix;
        }
        get Data() {
            return this.data;
        }
        identity() {
            return new Matrix3x3;
        }
        translate(_matrix, _xTranslation, _yTranslation) {
            return this.multiply(_matrix, this.translation(_xTranslation, _yTranslation));
        }
        rotate(_matrix, _angleInDegrees) {
            return this.multiply(_matrix, this.rotation(_angleInDegrees));
        }
        scale(_matrix, _xScale, _yscale) {
            return this.multiply(_matrix, this.scaling(_xScale, _yscale));
        }
        multiply(_a, _b) {
            let a00 = _a.data[0 * 3 + 0];
            let a01 = _a.data[0 * 3 + 1];
            let a02 = _a.data[0 * 3 + 2];
            let a10 = _a.data[1 * 3 + 0];
            let a11 = _a.data[1 * 3 + 1];
            let a12 = _a.data[1 * 3 + 2];
            let a20 = _a.data[2 * 3 + 0];
            let a21 = _a.data[2 * 3 + 1];
            let a22 = _a.data[2 * 3 + 2];
            let b00 = _b.data[0 * 3 + 0];
            let b01 = _b.data[0 * 3 + 1];
            let b02 = _b.data[0 * 3 + 2];
            let b10 = _b.data[1 * 3 + 0];
            let b11 = _b.data[1 * 3 + 1];
            let b12 = _b.data[1 * 3 + 2];
            let b20 = _b.data[2 * 3 + 0];
            let b21 = _b.data[2 * 3 + 1];
            let b22 = _b.data[2 * 3 + 2];
            let matrix = new Matrix3x3;
            matrix.data = [
                b00 * a00 + b01 * a10 + b02 * a20,
                b00 * a01 + b01 * a11 + b02 * a21,
                b00 * a02 + b01 * a12 + b02 * a22,
                b10 * a00 + b11 * a10 + b12 * a20,
                b10 * a01 + b11 * a11 + b12 * a21,
                b10 * a02 + b11 * a12 + b12 * a22,
                b20 * a00 + b21 * a10 + b22 * a20,
                b20 * a01 + b21 * a11 + b22 * a21,
                b20 * a02 + b21 * a12 + b22 * a22
            ];
            return matrix;
        }
        translation(_xTranslation, _yTranslation) {
            let matrix = new Matrix3x3;
            matrix.data = [
                1, 0, 0,
                0, 1, 0,
                _xTranslation, _yTranslation, 1
            ];
            return matrix;
        }
        scaling(_xScale, _yScale) {
            let matrix = new Matrix3x3;
            matrix.data = [
                _xScale, 0, 0,
                0, _yScale, 0,
                0, 0, 1
            ];
            return matrix;
        }
        rotation(_angleInDegrees) {
            let angleInDegrees = 360 - _angleInDegrees;
            let angleInRadians = angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            let matrix = new Matrix3x3;
            matrix.data = [
                cos, -sin, 0,
                sin, cos, 0,
                0, 0, 1
            ];
            return matrix;
        }
    }
    FudgeCore.Matrix3x3 = Matrix3x3;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Stores a 4x4 transformation matrix and provides operations for it.
     * ```plaintext
     * [ 0, 1, 2, 3 ] ← row vector x
     * [ 4, 5, 6, 7 ] ← row vector y
     * [ 8, 9,10,11 ] ← row vector z
     * [12,13,14,15 ] ← translation
     *            ↑  homogeneous column
     * ```
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Matrix4x4 extends FudgeCore.Mutable {
        constructor() {
            super();
            this.data = new Float32Array(16); // The data of the matrix.
            this.mutator = null; // prepared for optimization, keep mutator to reduce redundant calculation and for comparison. Set to null when data changes!
            this.data.set([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            this.resetCache();
        }
        /**
         * - get: a copy of the calculated translation vector
         * - set: effect the matrix ignoring its rotation and scaling
         */
        get translation() {
            if (!this.vectors.translation)
                this.vectors.translation = new FudgeCore.Vector3(this.data[12], this.data[13], this.data[14]);
            return this.vectors.translation.copy;
        }
        set translation(_translation) {
            this.data.set(_translation.get(), 12);
            // no full cache reset required
            this.vectors.translation = _translation.copy;
            this.mutator = null;
        }
        /**
         * - get: a copy of the calculated rotation vector
         * - set: effect the matrix
         */
        get rotation() {
            if (!this.vectors.rotation)
                this.vectors.rotation = this.getEulerAngles();
            return this.vectors.rotation.copy;
        }
        set rotation(_rotation) {
            this.mutate({ "rotation": _rotation });
            this.resetCache();
        }
        /**
         * - get: a copy of the calculated scale vector
         * - set: effect the matrix
         */
        get scaling() {
            if (!this.vectors.scaling)
                this.vectors.scaling = new FudgeCore.Vector3(Math.hypot(this.data[0], this.data[1], this.data[2]), Math.hypot(this.data[4], this.data[5], this.data[6]), Math.hypot(this.data[8], this.data[9], this.data[10]));
            return this.vectors.scaling.copy;
        }
        set scaling(_scaling) {
            this.mutate({ "scaling": _scaling });
            this.resetCache();
        }
        //#region STATICS
        /**
         * Retrieve a new identity matrix
         */
        static get IDENTITY() {
            // const result: Matrix4x4 = new Matrix4x4();
            const result = FudgeCore.Recycler.get(Matrix4x4);
            result.data.set([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            return result;
        }
        /**
         * Computes and returns the product of two passed matrices.
         * @param _a The matrix to multiply.
         * @param _b The matrix to multiply by.
         */
        static MULTIPLICATION(_a, _b) {
            let a = _a.data;
            let b = _b.data;
            // let matrix: Matrix4x4 = new Matrix4x4();
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            let a00 = a[0 * 4 + 0];
            let a01 = a[0 * 4 + 1];
            let a02 = a[0 * 4 + 2];
            let a03 = a[0 * 4 + 3];
            let a10 = a[1 * 4 + 0];
            let a11 = a[1 * 4 + 1];
            let a12 = a[1 * 4 + 2];
            let a13 = a[1 * 4 + 3];
            let a20 = a[2 * 4 + 0];
            let a21 = a[2 * 4 + 1];
            let a22 = a[2 * 4 + 2];
            let a23 = a[2 * 4 + 3];
            let a30 = a[3 * 4 + 0];
            let a31 = a[3 * 4 + 1];
            let a32 = a[3 * 4 + 2];
            let a33 = a[3 * 4 + 3];
            let b00 = b[0 * 4 + 0];
            let b01 = b[0 * 4 + 1];
            let b02 = b[0 * 4 + 2];
            let b03 = b[0 * 4 + 3];
            let b10 = b[1 * 4 + 0];
            let b11 = b[1 * 4 + 1];
            let b12 = b[1 * 4 + 2];
            let b13 = b[1 * 4 + 3];
            let b20 = b[2 * 4 + 0];
            let b21 = b[2 * 4 + 1];
            let b22 = b[2 * 4 + 2];
            let b23 = b[2 * 4 + 3];
            let b30 = b[3 * 4 + 0];
            let b31 = b[3 * 4 + 1];
            let b32 = b[3 * 4 + 2];
            let b33 = b[3 * 4 + 3];
            matrix.data.set([
                b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
                b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
                b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
                b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
                b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
                b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
                b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
                b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
                b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
                b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
                b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
                b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
                b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
                b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
                b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
                b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33
            ]);
            return matrix;
        }
        /**
         * Computes and returns the inverse of a passed matrix.
         * @param _matrix The matrix to compute the inverse of.
         */
        static INVERSION(_matrix) {
            let m = _matrix.data;
            let m00 = m[0 * 4 + 0];
            let m01 = m[0 * 4 + 1];
            let m02 = m[0 * 4 + 2];
            let m03 = m[0 * 4 + 3];
            let m10 = m[1 * 4 + 0];
            let m11 = m[1 * 4 + 1];
            let m12 = m[1 * 4 + 2];
            let m13 = m[1 * 4 + 3];
            let m20 = m[2 * 4 + 0];
            let m21 = m[2 * 4 + 1];
            let m22 = m[2 * 4 + 2];
            let m23 = m[2 * 4 + 3];
            let m30 = m[3 * 4 + 0];
            let m31 = m[3 * 4 + 1];
            let m32 = m[3 * 4 + 2];
            let m33 = m[3 * 4 + 3];
            let tmp0 = m22 * m33;
            let tmp1 = m32 * m23;
            let tmp2 = m12 * m33;
            let tmp3 = m32 * m13;
            let tmp4 = m12 * m23;
            let tmp5 = m22 * m13;
            let tmp6 = m02 * m33;
            let tmp7 = m32 * m03;
            let tmp8 = m02 * m23;
            let tmp9 = m22 * m03;
            let tmp10 = m02 * m13;
            let tmp11 = m12 * m03;
            let tmp12 = m20 * m31;
            let tmp13 = m30 * m21;
            let tmp14 = m10 * m31;
            let tmp15 = m30 * m11;
            let tmp16 = m10 * m21;
            let tmp17 = m20 * m11;
            let tmp18 = m00 * m31;
            let tmp19 = m30 * m01;
            let tmp20 = m00 * m21;
            let tmp21 = m20 * m01;
            let tmp22 = m00 * m11;
            let tmp23 = m10 * m01;
            let t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
                (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
            let t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
                (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
            let t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
                (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
            let t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
                (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
            let d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
            // let matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                d * t0,
                d * t1,
                d * t2,
                d * t3,
                d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) - (tmp0 * m10 + tmp3 * m20 + tmp4 * m30)),
                d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) - (tmp1 * m00 + tmp6 * m20 + tmp9 * m30)),
                d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) - (tmp2 * m00 + tmp7 * m10 + tmp10 * m30)),
                d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) - (tmp5 * m00 + tmp8 * m10 + tmp11 * m20)),
                d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) - (tmp13 * m13 + tmp14 * m23 + tmp17 * m33)),
                d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) - (tmp12 * m03 + tmp19 * m23 + tmp20 * m33)),
                d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) - (tmp15 * m03 + tmp18 * m13 + tmp23 * m33)),
                d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) - (tmp16 * m03 + tmp21 * m13 + tmp22 * m23)),
                d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) - (tmp16 * m32 + tmp12 * m12 + tmp15 * m22)),
                d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) - (tmp18 * m22 + tmp21 * m32 + tmp13 * m02)),
                d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) - (tmp22 * m32 + tmp14 * m02 + tmp19 * m12)),
                d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) - (tmp20 * m12 + tmp23 * m22 + tmp17 * m02)) // [15]
            ]);
            return matrix;
        }
        /**
         * Computes and returns a rotationmatrix that aligns a transformations z-axis with the vector between it and its target.
         * @param _transformPosition The x,y and z-coordinates of the object to rotate.
         * @param _targetPosition The position to look at.
         */
        static LOOK_AT(_transformPosition, _targetPosition, _up = FudgeCore.Vector3.Y()) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            let zAxis = FudgeCore.Vector3.DIFFERENCE(_transformPosition, _targetPosition);
            zAxis.normalize();
            let xAxis = FudgeCore.Vector3.NORMALIZATION(FudgeCore.Vector3.CROSS(_up, zAxis));
            let yAxis = FudgeCore.Vector3.NORMALIZATION(FudgeCore.Vector3.CROSS(zAxis, xAxis));
            matrix.data.set([
                xAxis.x, xAxis.y, xAxis.z, 0,
                yAxis.x, yAxis.y, yAxis.z, 0,
                zAxis.x, zAxis.y, zAxis.z, 0,
                _transformPosition.x,
                _transformPosition.y,
                _transformPosition.z,
                1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that translates coordinates along the x-, y- and z-axis according to the given vector.
         */
        static TRANSLATION(_translate) {
            // let matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                _translate.x, _translate.y, _translate.z, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that rotates coordinates on the x-axis when multiplied by.
         * @param _angleInDegrees The value of the rotation.
         */
        static ROTATION_X(_angleInDegrees) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            let angleInRadians = _angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            matrix.data.set([
                1, 0, 0, 0,
                0, cos, sin, 0,
                0, -sin, cos, 0,
                0, 0, 0, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that rotates coordinates on the y-axis when multiplied by.
         * @param _angleInDegrees The value of the rotation.
         */
        static ROTATION_Y(_angleInDegrees) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            let matrix = FudgeCore.Recycler.get(Matrix4x4);
            let angleInRadians = _angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            matrix.data.set([
                cos, 0, -sin, 0,
                0, 1, 0, 0,
                sin, 0, cos, 0,
                0, 0, 0, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that rotates coordinates on the z-axis when multiplied by.
         * @param _angleInDegrees The value of the rotation.
         */
        static ROTATION_Z(_angleInDegrees) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            let angleInRadians = _angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            matrix.data.set([
                cos, sin, 0, 0,
                -sin, cos, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that scales coordinates along the x-, y- and z-axis according to the given vector
         */
        static SCALING(_scalar) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                _scalar.x, 0, 0, 0,
                0, _scalar.y, 0, 0,
                0, 0, _scalar.z, 0,
                0, 0, 0, 1
            ]);
            return matrix;
        }
        //#endregion
        //#region PROJECTIONS
        /**
         * Computes and returns a matrix that applies perspective to an object, if its transform is multiplied by it.
         * @param _aspect The aspect ratio between width and height of projectionspace.(Default = canvas.clientWidth / canvas.ClientHeight)
         * @param _fieldOfViewInDegrees The field of view in Degrees. (Default = 45)
         * @param _near The near clipspace border on the z-axis.
         * @param _far The far clipspace border on the z-axis.
         * @param _direction The plane on which the fieldOfView-Angle is given
         */
        static PROJECTION_CENTRAL(_aspect, _fieldOfViewInDegrees, _near, _far, _direction) {
            let fieldOfViewInRadians = _fieldOfViewInDegrees * Math.PI / 180;
            let f = Math.tan(0.5 * (Math.PI - fieldOfViewInRadians));
            let rangeInv = 1.0 / (_near - _far);
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                f, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (_near + _far) * rangeInv, -1,
                0, 0, _near * _far * rangeInv * 2, 0
            ]);
            if (_direction == FudgeCore.FIELD_OF_VIEW.DIAGONAL) {
                _aspect = Math.sqrt(_aspect);
                matrix.data[0] = f / _aspect;
                matrix.data[5] = f * _aspect;
            }
            else if (_direction == FudgeCore.FIELD_OF_VIEW.VERTICAL)
                matrix.data[0] = f / _aspect;
            else //FOV_DIRECTION.HORIZONTAL
                matrix.data[5] = f * _aspect;
            return matrix;
        }
        /**
         * Computes and returns a matrix that applies orthographic projection to an object, if its transform is multiplied by it.
         * @param _left The positionvalue of the projectionspace's left border.
         * @param _right The positionvalue of the projectionspace's right border.
         * @param _bottom The positionvalue of the projectionspace's bottom border.
         * @param _top The positionvalue of the projectionspace's top border.
         * @param _near The positionvalue of the projectionspace's near border.
         * @param _far The positionvalue of the projectionspace's far border
         */
        static PROJECTION_ORTHOGRAPHIC(_left, _right, _bottom, _top, _near = -400, _far = 400) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                2 / (_right - _left), 0, 0, 0,
                0, 2 / (_top - _bottom), 0, 0,
                0, 0, 2 / (_near - _far), 0,
                (_left + _right) / (_left - _right),
                (_bottom + _top) / (_bottom - _top),
                (_near + _far) / (_near - _far),
                1
            ]);
            return matrix;
        }
        //#endregion
        //#region Rotation
        /**
         * Rotate this matrix by given vector in the order Z, Y, X. Right hand rotation is used, thumb points in axis direction, fingers curling indicate rotation
         * @param _by
         */
        rotate(_by, _fromLeft = false) {
            this.rotateZ(_by.z, _fromLeft);
            this.rotateY(_by.y, _fromLeft);
            this.rotateX(_by.x, _fromLeft);
        }
        /**
         * Adds a rotation around the x-Axis to this matrix
         */
        rotateX(_angleInDegrees, _fromLeft = false) {
            let rotation = Matrix4x4.ROTATION_X(_angleInDegrees);
            this.multiply(rotation, _fromLeft);
            FudgeCore.Recycler.store(rotation);
        }
        /**
         * Adds a rotation around the y-Axis to this matrix
         */
        rotateY(_angleInDegrees, _fromLeft = false) {
            let rotation = Matrix4x4.ROTATION_Y(_angleInDegrees);
            this.multiply(rotation, _fromLeft);
            FudgeCore.Recycler.store(rotation);
        }
        /**
         * Adds a rotation around the z-Axis to this matrix
         */
        rotateZ(_angleInDegrees, _fromLeft = false) {
            let rotation = Matrix4x4.ROTATION_Z(_angleInDegrees);
            this.multiply(rotation, _fromLeft);
            FudgeCore.Recycler.store(rotation);
        }
        /**
         * Adjusts the rotation of this matrix to face the given target and tilts it to accord with the given up vector
         */
        lookAt(_target, _up = FudgeCore.Vector3.Y()) {
            const matrix = Matrix4x4.LOOK_AT(this.translation, _target); // TODO: Handle rotation around z-axis
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        //#endregion
        //#region Translation
        /**
         * Add a translation by the given vector to this matrix
         */
        translate(_by) {
            const matrix = Matrix4x4.MULTIPLICATION(this, Matrix4x4.TRANSLATION(_by));
            // TODO: possible optimization, translation may alter mutator instead of deleting it.
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Add a translation along the x-Axis by the given amount to this matrix
         */
        translateX(_x) {
            this.data[12] += _x;
            this.mutator = null;
        }
        /**
         * Add a translation along the y-Axis by the given amount to this matrix
         */
        translateY(_y) {
            this.data[13] += _y;
            this.mutator = null;
        }
        /**
         * Add a translation along the y-Axis by the given amount to this matrix
         */
        translateZ(_z) {
            this.data[14] += _z;
            this.mutator = null;
        }
        //#endregion
        //#region Scaling
        /**
         * Add a scaling by the given vector to this matrix
         */
        scale(_by) {
            const matrix = Matrix4x4.MULTIPLICATION(this, Matrix4x4.SCALING(_by));
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Add a scaling along the x-Axis by the given amount to this matrix
         */
        scaleX(_by) {
            this.scale(new FudgeCore.Vector3(_by, 1, 1));
        }
        /**
         * Add a scaling along the y-Axis by the given amount to this matrix
         */
        scaleY(_by) {
            this.scale(new FudgeCore.Vector3(1, _by, 1));
        }
        /**
         * Add a scaling along the z-Axis by the given amount to this matrix
         */
        scaleZ(_by) {
            this.scale(new FudgeCore.Vector3(1, 1, _by));
        }
        //#endregion
        //#region Transformation
        /**
         * Multiply this matrix with the given matrix
         */
        multiply(_matrix, _fromLeft = false) {
            const matrix = _fromLeft ? Matrix4x4.MULTIPLICATION(_matrix, this) : Matrix4x4.MULTIPLICATION(this, _matrix);
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        //#endregion
        //#region Transfer
        /**
         * Calculates and returns the euler-angles representing the current rotation of this matrix
         */
        getEulerAngles() {
            let scaling = this.scaling;
            let s0 = this.data[0] / scaling.x;
            let s1 = this.data[1] / scaling.x;
            let s2 = this.data[2] / scaling.x;
            let s6 = this.data[6] / scaling.y;
            let s10 = this.data[10] / scaling.z;
            let sy = Math.hypot(s0, s1); // probably 2. param should be this.data[4] / scaling.y
            let singular = sy < 1e-6; // If
            let x1, y1, z1;
            let x2, y2, z2;
            if (!singular) {
                x1 = Math.atan2(s6, s10);
                y1 = Math.atan2(-s2, sy);
                z1 = Math.atan2(s1, s0);
                x2 = Math.atan2(-s6, -s10);
                y2 = Math.atan2(-s2, -sy);
                z2 = Math.atan2(-s1, -s0);
                if (Math.abs(x2) + Math.abs(y2) + Math.abs(z2) < Math.abs(x1) + Math.abs(y1) + Math.abs(z1)) {
                    x1 = x2;
                    y1 = y2;
                    z1 = z2;
                }
            }
            else {
                x1 = Math.atan2(-this.data[9] / scaling.z, this.data[5] / scaling.y);
                y1 = Math.atan2(-this.data[2] / scaling.x, sy);
                z1 = 0;
            }
            let rotation = new FudgeCore.Vector3(x1, y1, z1);
            rotation.scale(180 / Math.PI);
            return rotation;
        }
        /**
         * Sets the elements of this matrix to the values of the given matrix
         */
        set(_to) {
            // this.data = _to.get();
            this.data.set(_to.data);
            this.resetCache();
        }
        /**
         * Return the elements of this matrix as a Float32Array
         */
        get() {
            return new Float32Array(this.data);
        }
        serialize() {
            // TODO: save translation, rotation and scale as vectors for readability and manipulation
            let serialization = this.getMutator();
            return serialization;
        }
        deserialize(_serialization) {
            this.mutate(_serialization);
            return this;
        }
        getMutator() {
            if (this.mutator)
                return this.mutator;
            let mutator = {
                translation: this.translation.getMutator(),
                rotation: this.rotation.getMutator(),
                scaling: this.scaling.getMutator()
            };
            // cache mutator
            this.mutator = mutator;
            return mutator;
        }
        mutate(_mutator) {
            let oldTranslation = this.translation;
            let oldRotation = this.rotation;
            let oldScaling = this.scaling;
            let newTranslation = _mutator["translation"];
            let newRotation = _mutator["rotation"];
            let newScaling = _mutator["scaling"];
            let vectors = { translation: oldTranslation, rotation: oldRotation, scaling: oldScaling };
            if (newTranslation) {
                vectors.translation = new FudgeCore.Vector3(newTranslation.x != undefined ? newTranslation.x : oldTranslation.x, newTranslation.y != undefined ? newTranslation.y : oldTranslation.y, newTranslation.z != undefined ? newTranslation.z : oldTranslation.z);
            }
            if (newRotation) {
                vectors.rotation = new FudgeCore.Vector3(newRotation.x != undefined ? newRotation.x : oldRotation.x, newRotation.y != undefined ? newRotation.y : oldRotation.y, newRotation.z != undefined ? newRotation.z : oldRotation.z);
            }
            if (newScaling) {
                vectors.scaling = new FudgeCore.Vector3(newScaling.x != undefined ? newScaling.x : oldScaling.x, newScaling.y != undefined ? newScaling.y : oldScaling.y, newScaling.z != undefined ? newScaling.z : oldScaling.z);
            }
            // TODO: possible performance optimization when only one or two components change, then use old matrix instead of IDENTITY and transform by differences/quotients
            let matrix = Matrix4x4.IDENTITY;
            if (vectors.translation)
                matrix.translate(vectors.translation);
            if (vectors.rotation) {
                matrix.rotateZ(vectors.rotation.z);
                matrix.rotateY(vectors.rotation.y);
                matrix.rotateX(vectors.rotation.x);
            }
            if (vectors.scaling)
                matrix.scale(vectors.scaling);
            this.set(matrix);
            this.vectors = vectors;
        }
        getMutatorAttributeTypes(_mutator) {
            let types = {};
            if (_mutator.translation)
                types.translation = "Vector3";
            if (_mutator.rotation)
                types.rotation = "Vector3";
            if (_mutator.scaling)
                types.scaling = "Vector3";
            return types;
        }
        reduceMutator(_mutator) { }
        resetCache() {
            this.vectors = { translation: null, rotation: null, scaling: null };
            this.mutator = null;
        }
    }
    FudgeCore.Matrix4x4 = Matrix4x4;
    //#endregion
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Defines the origin of a rectangle
     */
    let ORIGIN2D;
    (function (ORIGIN2D) {
        ORIGIN2D[ORIGIN2D["TOPLEFT"] = 0] = "TOPLEFT";
        ORIGIN2D[ORIGIN2D["TOPCENTER"] = 1] = "TOPCENTER";
        ORIGIN2D[ORIGIN2D["TOPRIGHT"] = 2] = "TOPRIGHT";
        ORIGIN2D[ORIGIN2D["CENTERLEFT"] = 16] = "CENTERLEFT";
        ORIGIN2D[ORIGIN2D["CENTER"] = 17] = "CENTER";
        ORIGIN2D[ORIGIN2D["CENTERRIGHT"] = 18] = "CENTERRIGHT";
        ORIGIN2D[ORIGIN2D["BOTTOMLEFT"] = 32] = "BOTTOMLEFT";
        ORIGIN2D[ORIGIN2D["BOTTOMCENTER"] = 33] = "BOTTOMCENTER";
        ORIGIN2D[ORIGIN2D["BOTTOMRIGHT"] = 34] = "BOTTOMRIGHT";
    })(ORIGIN2D = FudgeCore.ORIGIN2D || (FudgeCore.ORIGIN2D = {}));
    /**
     * Defines a rectangle with position and size and add comfortable methods to it
     * @author Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Rectangle extends FudgeCore.Mutable {
        constructor(_x = 0, _y = 0, _width = 1, _height = 1, _origin = ORIGIN2D.TOPLEFT) {
            super();
            this.position = FudgeCore.Recycler.get(FudgeCore.Vector2);
            this.size = FudgeCore.Recycler.get(FudgeCore.Vector2);
            this.setPositionAndSize(_x, _y, _width, _height, _origin);
        }
        /**
         * Returns a new rectangle created with the given parameters
         */
        static GET(_x = 0, _y = 0, _width = 1, _height = 1, _origin = ORIGIN2D.TOPLEFT) {
            let rect = FudgeCore.Recycler.get(Rectangle);
            rect.setPositionAndSize(_x, _y, _width, _height);
            return rect;
        }
        /**
         * Sets the position and size of the rectangle according to the given parameters
         */
        setPositionAndSize(_x = 0, _y = 0, _width = 1, _height = 1, _origin = ORIGIN2D.TOPLEFT) {
            this.size.set(_width, _height);
            switch (_origin & 0x03) {
                case 0x00:
                    this.position.x = _x;
                    break;
                case 0x01:
                    this.position.x = _x - _width / 2;
                    break;
                case 0x02:
                    this.position.x = _x - _width;
                    break;
            }
            switch (_origin & 0x30) {
                case 0x00:
                    this.position.y = _y;
                    break;
                case 0x10:
                    this.position.y = _y - _height / 2;
                    break;
                case 0x20:
                    this.position.y = _y - _height;
                    break;
            }
        }
        get x() {
            return this.position.x;
        }
        get y() {
            return this.position.y;
        }
        get width() {
            return this.size.x;
        }
        get height() {
            return this.size.y;
        }
        get left() {
            return this.position.x;
        }
        get top() {
            return this.position.y;
        }
        get right() {
            return this.position.x + this.size.x;
        }
        get bottom() {
            return this.position.y + this.size.y;
        }
        set x(_x) {
            this.position.x = _x;
        }
        set y(_y) {
            this.position.y = _y;
        }
        set width(_width) {
            this.position.x = _width;
        }
        set height(_height) {
            this.position.y = _height;
        }
        set left(_value) {
            this.size.x = this.right - _value;
            this.position.x = _value;
        }
        set top(_value) {
            this.size.y = this.bottom - _value;
            this.position.y = _value;
        }
        set right(_value) {
            this.size.x = this.position.x + _value;
        }
        set bottom(_value) {
            this.size.y = this.position.y + _value;
        }
        /**
         * Returns true if the given point is inside of this rectangle or on the border
         * @param _point
         */
        isInside(_point) {
            return (_point.x >= this.left && _point.x <= this.right && _point.y >= this.top && _point.y <= this.bottom);
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Rectangle = Rectangle;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Stores and manipulates a twodimensional vector comprised of the components x and y
     * ```plaintext
     *            +y
     *             |__ +x
     * ```
     * @authors Lukas Scheuerle, HFU, 2019
     */
    class Vector2 extends FudgeCore.Mutable {
        constructor(_x = 0, _y = 0) {
            super();
            this.data = new Float32Array([_x, _y]);
        }
        get x() {
            return this.data[0];
        }
        get y() {
            return this.data[1];
        }
        set x(_x) {
            this.data[0] = _x;
        }
        set y(_y) {
            this.data[1] = _y;
        }
        /**
         * A shorthand for writing `new Vector2(0, 0)`.
         * @returns A new vector with the values (0, 0)
         */
        static ZERO() {
            let vector = new Vector2();
            return vector;
        }
        /**
         * A shorthand for writing `new Vector2(_scale, _scale)`.
         * @param _scale the scale of the vector. Default: 1
         */
        static ONE(_scale = 1) {
            let vector = new Vector2(_scale, _scale);
            return vector;
        }
        /**
         * A shorthand for writing `new Vector2(0, y)`.
         * @param _scale The number to write in the y coordinate. Default: 1
         * @returns A new vector with the values (0, _scale)
         */
        static Y(_scale = 1) {
            let vector = new Vector2(0, _scale);
            return vector;
        }
        /**
         * A shorthand for writing `new Vector2(x, 0)`.
         * @param _scale The number to write in the x coordinate. Default: 1
         * @returns A new vector with the values (_scale, 0)
         */
        static X(_scale = 1) {
            let vector = new Vector2(_scale, 0);
            return vector;
        }
        /**
         * Normalizes a given vector to the given length without editing the original vector.
         * @param _vector the vector to normalize
         * @param _length the length of the resulting vector. defaults to 1
         * @returns a new vector representing the normalised vector scaled by the given length
         */
        static NORMALIZATION(_vector, _length = 1) {
            let vector = Vector2.ZERO();
            try {
                let [x, y] = _vector.data;
                let factor = _length / Math.hypot(x, y);
                vector.data = new Float32Array([_vector.x * factor, _vector.y * factor]);
            }
            catch (_error) {
                console.warn(_error);
            }
            return vector;
        }
        /**
         * Scales a given vector by a given scale without changing the original vector
         * @param _vector The vector to scale.
         * @param _scale The scale to scale with.
         * @returns A new vector representing the scaled version of the given vector
         */
        static SCALE(_vector, _scale) {
            let vector = new Vector2();
            return vector;
        }
        /**
         * Sums up multiple vectors.
         * @param _vectors A series of vectors to sum up
         * @returns A new vector representing the sum of the given vectors
         */
        static SUM(..._vectors) {
            let result = new Vector2();
            for (let vector of _vectors)
                result.data = new Float32Array([result.x + vector.x, result.y + vector.y]);
            return result;
        }
        /**
         * Subtracts two vectors.
         * @param _a The vector to subtract from.
         * @param _b The vector to subtract.
         * @returns A new vector representing the difference of the given vectors
         */
        static DIFFERENCE(_a, _b) {
            let vector = new Vector2;
            vector.data = new Float32Array([_a.x - _b.x, _a.y - _b.y]);
            return vector;
        }
        /**
         * Computes the dotproduct of 2 vectors.
         * @param _a The vector to multiply.
         * @param _b The vector to multiply by.
         * @returns A new vector representing the dotproduct of the given vectors
         */
        static DOT(_a, _b) {
            let scalarProduct = _a.x * _b.x + _a.y * _b.y;
            return scalarProduct;
        }
        /**
         * Returns the magnitude of a given vector.
         * If you only need to compare magnitudes of different vectors, you can compare squared magnitudes using Vector2.MAGNITUDESQR instead.
         * @see Vector2.MAGNITUDESQR
         * @param _vector The vector to get the magnitude of.
         * @returns A number representing the magnitude of the given vector.
         */
        static MAGNITUDE(_vector) {
            let magnitude = Math.sqrt(Vector2.MAGNITUDESQR(_vector));
            return magnitude;
        }
        /**
         * Returns the squared magnitude of a given vector. Much less calculation intensive than Vector2.MAGNITUDE, should be used instead if possible.
         * @param _vector The vector to get the squared magnitude of.
         * @returns A number representing the squared magnitude of the given vector.
         */
        static MAGNITUDESQR(_vector) {
            let magnitude = Vector2.DOT(_vector, _vector);
            return magnitude;
        }
        /**
         * Calculates the cross product of two Vectors. Due to them being only 2 Dimensional, the result is a single number,
         * which implicitly is on the Z axis. It is also the signed magnitude of the result.
         * @param _a Vector to compute the cross product on
         * @param _b Vector to compute the cross product with
         * @returns A number representing result of the cross product.
         */
        static CROSSPRODUCT(_a, _b) {
            let crossProduct = _a.x * _b.y - _a.y * _b.x;
            return crossProduct;
        }
        /**
         * Calculates the orthogonal vector to the given vector. Rotates counterclockwise by default.
         * ```plaintext
         *    ^                |
         *    |  =>  <--  =>   v  =>  -->
         * ```
         * @param _vector Vector to get the orthogonal equivalent of
         * @param _clockwise Should the rotation be clockwise instead of the default counterclockwise? default: false
         * @returns A Vector that is orthogonal to and has the same magnitude as the given Vector.
         */
        static ORTHOGONAL(_vector, _clockwise = false) {
            if (_clockwise)
                return new Vector2(_vector.y, -_vector.x);
            else
                return new Vector2(-_vector.y, _vector.x);
        }
        /**
         * Adds the given vector to the executing vector, changing the executor.
         * @param _addend The vector to add.
         */
        add(_addend) {
            this.data = new Vector2(_addend.x + this.x, _addend.y + this.y).data;
        }
        /**
         * Subtracts the given vector from the executing vector, changing the executor.
         * @param _subtrahend The vector to subtract.
         */
        subtract(_subtrahend) {
            this.data = new Vector2(this.x - _subtrahend.x, this.y - _subtrahend.y).data;
        }
        /**
         * Scales the Vector by the _scale.
         * @param _scale The scale to multiply the vector with.
         */
        scale(_scale) {
            this.data = new Vector2(_scale * this.x, _scale * this.y).data;
        }
        /**
         * Normalizes the vector.
         * @param _length A modificator to get a different length of normalized vector.
         */
        normalize(_length = 1) {
            this.data = Vector2.NORMALIZATION(this, _length).data;
        }
        /**
         * Sets the Vector to the given parameters. Ommitted parameters default to 0.
         * @param _x new x to set
         * @param _y new y to set
         */
        set(_x = 0, _y = 0) {
            this.data = new Float32Array([_x, _y]);
        }
        /**
         * Checks whether the given Vector is equal to the executed Vector.
         * @param _vector The vector to comapre with.
         * @returns true if the two vectors are equal, otherwise false
         */
        equals(_vector) {
            if (this.data[0] == _vector.data[0] && this.data[1] == _vector.data[1])
                return true;
            return false;
        }
        /**
         * @returns An array of the data of the vector
         */
        get() {
            return new Float32Array(this.data);
        }
        /**
         * @returns A deep copy of the vector.
         */
        get copy() {
            return new Vector2(this.x, this.y);
        }
        /**
         * Adds a z-component to the vector and returns a new Vector3
         */
        toVector3() {
            return new FudgeCore.Vector3(this.x, this.y, 0);
        }
        getMutator() {
            let mutator = {
                x: this.data[0], y: this.data[1]
            };
            return mutator;
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Vector2 = Vector2;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Stores and manipulates a threedimensional vector comprised of the components x, y and z
     * ```plaintext
     *            +y
     *             |__ +x
     *            /
     *          +z
     * ```
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Vector3 extends FudgeCore.Mutable {
        constructor(_x = 0, _y = 0, _z = 0) {
            super();
            this.data = new Float32Array([_x, _y, _z]);
        }
        // TODO: implement equals-functions
        get x() {
            return this.data[0];
        }
        get y() {
            return this.data[1];
        }
        get z() {
            return this.data[2];
        }
        set x(_x) {
            this.data[0] = _x;
        }
        set y(_y) {
            this.data[1] = _y;
        }
        set z(_z) {
            this.data[2] = _z;
        }
        static X(_scale = 1) {
            const vector = new Vector3(_scale, 0, 0);
            return vector;
        }
        static Y(_scale = 1) {
            const vector = new Vector3(0, _scale, 0);
            return vector;
        }
        static Z(_scale = 1) {
            const vector = new Vector3(0, 0, _scale);
            return vector;
        }
        static ZERO() {
            const vector = new Vector3(0, 0, 0);
            return vector;
        }
        static ONE(_scale = 1) {
            const vector = new Vector3(_scale, _scale, _scale);
            return vector;
        }
        static TRANSFORMATION(_vector, _matrix, _includeTranslation = true) {
            let result = new Vector3();
            let m = _matrix.get();
            let [x, y, z] = _vector.get();
            result.x = m[0] * x + m[4] * y + m[8] * z;
            result.y = m[1] * x + m[5] * y + m[9] * z;
            result.z = m[2] * x + m[6] * y + m[10] * z;
            if (_includeTranslation) {
                result.add(_matrix.translation);
            }
            return result;
        }
        static NORMALIZATION(_vector, _length = 1) {
            let vector = Vector3.ZERO();
            try {
                let [x, y, z] = _vector.data;
                let factor = _length / Math.hypot(x, y, z);
                vector.data = new Float32Array([_vector.x * factor, _vector.y * factor, _vector.z * factor]);
            }
            catch (_error) {
                FudgeCore.Debug.warn(_error);
            }
            return vector;
        }
        /**
         * Sums up multiple vectors.
         * @param _vectors A series of vectors to sum up
         * @returns A new vector representing the sum of the given vectors
         */
        static SUM(..._vectors) {
            let result = new Vector3();
            for (let vector of _vectors)
                result.data = new Float32Array([result.x + vector.x, result.y + vector.y, result.z + vector.z]);
            return result;
        }
        /**
         * Subtracts two vectors.
         * @param _a The vector to subtract from.
         * @param _b The vector to subtract.
         * @returns A new vector representing the difference of the given vectors
         */
        static DIFFERENCE(_a, _b) {
            let vector = new Vector3;
            vector.data = new Float32Array([_a.x - _b.x, _a.y - _b.y, _a.z - _b.z]);
            return vector;
        }
        /**
         * Returns a new vector representing the given vector scaled by the given scaling factor
         */
        static SCALE(_vector, _scaling) {
            let scaled = new Vector3();
            scaled.data = new Float32Array([_vector.x * _scaling, _vector.y * _scaling, _vector.z * _scaling]);
            return scaled;
        }
        /**
         * Computes the crossproduct of 2 vectors.
         * @param _a The vector to multiply.
         * @param _b The vector to multiply by.
         * @returns A new vector representing the crossproduct of the given vectors
         */
        static CROSS(_a, _b) {
            let vector = new Vector3;
            vector.data = new Float32Array([
                _a.y * _b.z - _a.z * _b.y,
                _a.z * _b.x - _a.x * _b.z,
                _a.x * _b.y - _a.y * _b.x
            ]);
            return vector;
        }
        /**
         * Computes the dotproduct of 2 vectors.
         * @param _a The vector to multiply.
         * @param _b The vector to multiply by.
         * @returns A new vector representing the dotproduct of the given vectors
         */
        static DOT(_a, _b) {
            let scalarProduct = _a.x * _b.x + _a.y * _b.y + _a.z * _b.z;
            return scalarProduct;
        }
        /**
         * Calculates and returns the reflection of the incoming vector at the given normal vector. The length of normal should be 1.
         *     __________________
         *           /|\
         * incoming / | \ reflection
         *         /  |  \
         *          normal
         *
         */
        static REFLECTION(_incoming, _normal) {
            let dot = -Vector3.DOT(_incoming, _normal);
            let reflection = Vector3.SUM(_incoming, Vector3.SCALE(_normal, 2 * dot));
            return reflection;
        }
        add(_addend) {
            this.data = new Vector3(_addend.x + this.x, _addend.y + this.y, _addend.z + this.z).data;
        }
        subtract(_subtrahend) {
            this.data = new Vector3(this.x - _subtrahend.x, this.y - _subtrahend.y, this.z - _subtrahend.z).data;
        }
        scale(_scale) {
            this.data = new Vector3(_scale * this.x, _scale * this.y, _scale * this.z).data;
        }
        normalize(_length = 1) {
            this.data = Vector3.NORMALIZATION(this, _length).data;
        }
        set(_x = 0, _y = 0, _z = 0) {
            this.data = new Float32Array([_x, _y, _z]);
        }
        get() {
            return new Float32Array(this.data);
        }
        get copy() {
            return new Vector3(this.x, this.y, this.z);
        }
        transform(_matrix, _includeTranslation = true) {
            this.data = Vector3.TRANSFORMATION(this, _matrix, _includeTranslation).data;
        }
        /**
         * Drops the z-component and returns a Vector2 consisting of the x- and y-components
         */
        toVector2() {
            return new FudgeCore.Vector2(this.x, this.y);
        }
        reflect(_normal) {
            const reflected = Vector3.REFLECTION(this, _normal);
            this.set(reflected.x, reflected.y, reflected.z);
            FudgeCore.Recycler.store(reflected);
        }
        toString() {
            let result = `(${this.x}, ${this.y}, ${this.z})`;
            return result;
        }
        map(_function) {
            let copy = FudgeCore.Recycler.get(Vector3);
            copy.data = this.data.map(_function);
            return copy;
        }
        getMutator() {
            let mutator = {
                x: this.data[0], y: this.data[1], z: this.data[2]
            };
            return mutator;
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Vector3 = Vector3;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Abstract base class for all meshes.
     * Meshes provide indexed vertices, the order of indices to create trigons and normals, and texture coordinates
     *
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Mesh {
        constructor() {
            this.idResource = undefined;
        }
        static getBufferSpecification() {
            return { size: 3, dataType: WebGL2RenderingContext.FLOAT, normalize: false, stride: 0, offset: 0 };
        }
        getVertexCount() {
            return this.vertices.length / Mesh.getBufferSpecification().size;
        }
        getIndexCount() {
            return this.indices.length;
        }
        // Serialize/Deserialize for all meshes that calculate without parameters
        serialize() {
            let serialization = {
                idResource: this.idResource
            }; // no data needed ...
            return serialization;
        }
        deserialize(_serialization) {
            this.create(); // TODO: must not be created, if an identical mesh already exists
            this.idResource = _serialization.idResource;
            return this;
        }
    }
    FudgeCore.Mesh = Mesh;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Generate a simple cube with edges of length 1, each face consisting of two trigons
     * ```plaintext
     *            4____7
     *           0/__3/|
     *            ||5_||6
     *           1|/_2|/
     * ```
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class MeshCube extends FudgeCore.Mesh {
        constructor() {
            super();
            this.create();
        }
        create() {
            this.vertices = this.createVertices();
            this.indices = this.createIndices();
            this.textureUVs = this.createTextureUVs();
            this.normalsFace = this.createFaceNormals();
        }
        createVertices() {
            let vertices = new Float32Array([
                // First wrap
                // front
                /*0*/ -1, 1, 1, /*1*/ -1, -1, 1, /*2*/ 1, -1, 1, /*3*/ 1, 1, 1,
                // back
                /*4*/ -1, 1, -1, /* 5*/ -1, -1, -1, /* 6*/ 1, -1, -1, /* 7*/ 1, 1, -1,
                // Second wrap
                // front
                /*0*/ -1, 1, 1, /*1*/ -1, -1, 1, /*2*/ 1, -1, 1, /*3*/ 1, 1, 1,
                // back
                /*4*/ -1, 1, -1, /* 5*/ -1, -1, -1, /* 6*/ 1, -1, -1, /* 7*/ 1, 1, -1
            ]);
            // scale down to a length of 1 for all edges
            vertices = vertices.map(_value => _value / 2);
            return vertices;
        }
        createIndices() {
            let indices = new Uint16Array([
                // First wrap
                // front
                1, 2, 0, 2, 3, 0,
                // right
                2, 6, 3, 6, 7, 3,
                // back
                6, 5, 7, 5, 4, 7,
                // Second wrap
                // left
                5 + 8, 1 + 8, 4 + 8, 1 + 8, 0 + 8, 4 + 8,
                // top
                4 + 8, 0 + 8, 3 + 8, 7 + 8, 4 + 8, 3 + 8,
                // bottom
                5 + 8, 6 + 8, 1 + 8, 6 + 8, 2 + 8, 1 + 8
                /*,
                // left
                4, 5, 1, 4, 1, 0,
                // top
                4, 0, 3, 4, 3, 7,
                // bottom
                1, 5, 6, 1, 6, 2
                */
            ]);
            return indices;
        }
        createTextureUVs() {
            let textureUVs = new Float32Array([
                // First wrap
                // front
                /*0*/ 0, 0, /*1*/ 0, 1, /*2*/ 1, 1, /*3*/ 1, 0,
                // back
                /*4*/ 3, 0, /*5*/ 3, 1, /*6*/ 2, 1, /*7*/ 2, 0,
                // Second wrap
                // front
                /*0*/ 1, 0, /*1*/ 1, 1, /*2*/ 1, 2, /*3*/ 1, -1,
                // back
                /*4*/ 0, 0, /*5*/ 0, 1, /*6*/ 0, 2, /*7*/ 0, -1
            ]);
            return textureUVs;
        }
        createFaceNormals() {
            let normals = new Float32Array([
                // for each triangle, the last vertex of the three defining refers to the normalvector when using flat shading
                // First wrap
                // front
                /*0*/ 0, 0, 1, /*1*/ 0, 0, 0, /*2*/ 0, 0, 0, /*3*/ 1, 0, 0,
                // back
                /*4*/ 0, 0, 0, /*5*/ 0, 0, 0, /*6*/ 0, 0, 0, /*7*/ 0, 0, -1,
                // Second wrap
                // front
                /*0*/ 0, 0, 0, /*1*/ 0, -1, 0, /*2*/ 0, 0, 0, /*3*/ 0, 1, 0,
                // back
                /*4*/ -1, 0, 0, /*5*/ 0, 0, 0, /*6*/ 0, 0, 0, /*7*/ 0, 0, 0
            ]);
            //normals = this.createVertices();
            return normals;
        }
    }
    FudgeCore.MeshCube = MeshCube;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Generate a simple pyramid with edges at the base of length 1 and a height of 1. The sides consisting of one, the base of two trigons
     * ```plaintext
     *               4
     *              /\`.
     *            3/__\_\ 2
     *           0/____\/1
     * ```
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class MeshPyramid extends FudgeCore.Mesh {
        constructor() {
            super();
            this.create();
        }
        create() {
            this.vertices = this.createVertices();
            this.indices = this.createIndices();
            this.textureUVs = this.createTextureUVs();
            this.normalsFace = this.createFaceNormals();
        }
        createVertices() {
            let vertices = new Float32Array([
                // floor
                /*0*/ -1, 0, 1, /*1*/ 1, 0, 1, /*2*/ 1, 0, -1, /*3*/ -1, 0, -1,
                // tip
                /*4*/ 0, 2, 0,
                // floor again for texturing and normals
                /*5*/ -1, 0, 1, /*6*/ 1, 0, 1, /*7*/ 1, 0, -1, /*8*/ -1, 0, -1
            ]);
            // scale down to a length of 1 for bottom edges and height
            vertices = vertices.map(_value => _value / 2);
            return vertices;
        }
        createIndices() {
            let indices = new Uint16Array([
                // front
                4, 0, 1,
                // right
                4, 1, 2,
                // back
                4, 2, 3,
                // left
                4, 3, 0,
                // bottom
                5 + 0, 5 + 2, 5 + 1, 5 + 0, 5 + 3, 5 + 2
            ]);
            return indices;
        }
        createTextureUVs() {
            let textureUVs = new Float32Array([
                // front
                /*0*/ 0, 1, /*1*/ 0.5, 1, /*2*/ 1, 1, /*3*/ 0.5, 1,
                // back
                /*4*/ 0.5, 0,
                /*5*/ 0, 0, /*6*/ 1, 0, /*7*/ 1, 1, /*8*/ 0, 1
            ]);
            return textureUVs;
        }
        createFaceNormals() {
            let normals = [];
            let vertices = [];
            for (let v = 0; v < this.vertices.length; v += 3)
                vertices.push(new FudgeCore.Vector3(this.vertices[v], this.vertices[v + 1], this.vertices[v + 2]));
            for (let i = 0; i < this.indices.length; i += 3) {
                let vertex = [this.indices[i], this.indices[i + 1], this.indices[i + 2]];
                let v0 = FudgeCore.Vector3.DIFFERENCE(vertices[vertex[0]], vertices[vertex[1]]);
                let v1 = FudgeCore.Vector3.DIFFERENCE(vertices[vertex[0]], vertices[vertex[2]]);
                let normal = FudgeCore.Vector3.NORMALIZATION(FudgeCore.Vector3.CROSS(v0, v1));
                let index = vertex[2] * 3;
                normals[index] = normal.x;
                normals[index + 1] = normal.y;
                normals[index + 2] = normal.z;
                // normals.push(normal.x, normal.y, normal.z);
            }
            normals.push(0, 0, 0);
            return new Float32Array(normals);
        }
    }
    FudgeCore.MeshPyramid = MeshPyramid;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Generate a simple quad with edges of length 1, the face consisting of two trigons
     * ```plaintext
     *        0 __ 3
     *         |__|
     *        1    2
     * ```
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class MeshQuad extends FudgeCore.Mesh {
        constructor() {
            super();
            this.create();
        }
        create() {
            this.vertices = this.createVertices();
            this.indices = this.createIndices();
            this.textureUVs = this.createTextureUVs();
            this.normalsFace = this.createFaceNormals();
        }
        createVertices() {
            let vertices = new Float32Array([
                /*0*/ -1, 1, 0, /*1*/ -1, -1, 0, /*2*/ 1, -1, 0, /*3*/ 1, 1, 0
            ]);
            vertices = vertices.map(_value => _value / 2);
            return vertices;
        }
        createIndices() {
            let indices = new Uint16Array([
                1, 2, 0, 2, 3, 0
            ]);
            return indices;
        }
        createTextureUVs() {
            let textureUVs = new Float32Array([
                // front
                /*0*/ 0, 0, /*1*/ 0, 1, /*2*/ 1, 1, /*3*/ 1, 0
            ]);
            return textureUVs;
        }
        createFaceNormals() {
            return new Float32Array([
                /*0*/ 0, 0, 1, /*1*/ 0, 0, 0, /*2*/ 0, 0, 0, /*3*/ 1, 0, 0
            ]);
        }
    }
    FudgeCore.MeshQuad = MeshQuad;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Represents a node in the scenetree.
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Node extends FudgeCore.EventTargetƒ {
        /**
         * Creates a new node with a name and initializes all attributes
         * @param _name The name by which the node can be called.
         */
        constructor(_name) {
            super();
            this.mtxWorld = FudgeCore.Matrix4x4.IDENTITY;
            this.timestampUpdate = 0;
            this.parent = null; // The parent of this node.
            this.children = []; // array of child nodes appended to this node.
            this.components = {};
            // private tags: string[] = []; // Names of tags that are attached to this node. (TODO: As of yet no functionality)
            // private layers: string[] = []; // Names of the layers this node is on. (TODO: As of yet no functionality)
            this.listeners = {};
            this.captures = {};
            this.name = _name;
        }
        /**
         * Returns a reference to this nodes parent node
         */
        getParent() {
            return this.parent;
        }
        /**
         * Traces back the ancestors of this node and returns the first
         */
        getAncestor() {
            let ancestor = this;
            while (ancestor.getParent())
                ancestor = ancestor.getParent();
            return ancestor;
        }
        /**
         * Shortcut to retrieve this nodes [[ComponentTransform]]
         */
        get cmpTransform() {
            return this.getComponents(FudgeCore.ComponentTransform)[0];
        }
        /**
         * Shortcut to retrieve the local [[Matrix4x4]] attached to this nodes [[ComponentTransform]]
         * Returns null if no [[ComponentTransform]] is attached
         */
        // TODO: rejected for now, since there is some computational overhead, so node.mtxLocal should not be used carelessly
        // public get mtxLocal(): Matrix4x4 {
        //     let cmpTransform: ComponentTransform = this.cmpTransform;
        //     if (cmpTransform)
        //         return cmpTransform.local;
        //     else
        //         return null;
        // }
        // #region Scenetree
        /**
         * Returns a clone of the list of children
         */
        getChildren() {
            return this.children.slice(0);
        }
        /**
         * Returns an array of references to childnodes with the supplied name.
         * @param _name The name of the nodes to be found.
         * @return An array with references to nodes
         */
        getChildrenByName(_name) {
            let found = [];
            found = this.children.filter((_node) => _node.name == _name);
            return found;
        }
        /**
         * Adds the given reference to a node to the list of children, if not already in
         * @param _node The node to be added as a child
         * @throws Error when trying to add an ancestor of this
         */
        appendChild(_node) {
            if (this.children.includes(_node))
                // _node is already a child of this
                return;
            let ancestor = this;
            while (ancestor) {
                ancestor.timestampUpdate = 0;
                if (ancestor == _node)
                    throw (new Error("Cyclic reference prohibited in node hierarchy, ancestors must not be added as children"));
                else
                    ancestor = ancestor.parent;
            }
            this.children.push(_node);
            _node.setParent(this);
            _node.dispatchEvent(new Event("childAdd" /* CHILD_APPEND */, { bubbles: true }));
        }
        /**
         * Removes the reference to the give node from the list of children
         * @param _node The node to be removed.
         */
        removeChild(_node) {
            let found = this.findChild(_node);
            if (found < 0)
                return;
            _node.dispatchEvent(new Event("childRemove" /* CHILD_REMOVE */, { bubbles: true }));
            this.children.splice(found, 1);
            _node.setParent(null);
        }
        /**
         * Returns the position of the node in the list of children or -1 if not found
         * @param _node The node to be found.
         */
        findChild(_node) {
            return this.children.indexOf(_node);
        }
        /**
         * Replaces a child node with another, preserving the position in the list of children
         * @param _replace The node to be replaced
         * @param _with The node to replace with
         */
        replaceChild(_replace, _with) {
            let found = this.findChild(_replace);
            if (found < 0)
                return false;
            let previousParent = _with.getParent();
            if (previousParent)
                previousParent.removeChild(_with);
            _replace.setParent(null);
            this.children[found] = _with;
            _with.setParent(this);
            return true;
        }
        /**
         * Generator yielding the node and all successors in the branch below for iteration
         */
        get branch() {
            return this.getBranchGenerator();
        }
        isUpdated(_timestampUpdate) {
            return (this.timestampUpdate == _timestampUpdate);
        }
        /**
         * Applies a Mutator from [[Animation]] to all its components and transfers it to its children.
         * @param _mutator The mutator generated from an [[Animation]]
         */
        applyAnimation(_mutator) {
            if (_mutator.components) {
                for (let componentName in _mutator.components) {
                    if (this.components[componentName]) {
                        let mutatorOfComponent = _mutator.components;
                        for (let i in mutatorOfComponent[componentName]) {
                            if (this.components[componentName][+i]) {
                                let componentToMutate = this.components[componentName][+i];
                                let mutatorArray = mutatorOfComponent[componentName];
                                let mutatorWithComponentName = mutatorArray[+i];
                                for (let cname in mutatorWithComponentName) { // trick used to get the only entry in the list
                                    let mutatorToGive = mutatorWithComponentName[cname];
                                    componentToMutate.mutate(mutatorToGive);
                                }
                            }
                        }
                    }
                }
            }
            if (_mutator.children) {
                for (let i = 0; i < _mutator.children.length; i++) {
                    let name = _mutator.children[i]["ƒ.Node"].name;
                    let childNodes = this.getChildrenByName(name);
                    for (let childNode of childNodes) {
                        childNode.applyAnimation(_mutator.children[i]["ƒ.Node"]);
                    }
                }
            }
        }
        // #endregion
        // #region Components
        /**
         * Returns a list of all components attached to this node, independent of type.
         */
        getAllComponents() {
            let all = [];
            for (let type in this.components) {
                all = all.concat(this.components[type]);
            }
            return all;
        }
        /**
         * Returns a clone of the list of components of the given class attached to this node.
         * @param _class The class of the components to be found.
         */
        getComponents(_class) {
            return (this.components[_class.name] || []).slice(0);
        }
        /**
         * Returns the first compontent found of the given class attached this node or null, if list is empty or doesn't exist
         * @param _class The class of the components to be found.
         */
        getComponent(_class) {
            let list = this.components[_class.name];
            if (list)
                return list[0];
            return null;
        }
        /**
         * Adds the supplied component into the nodes component map.
         * @param _component The component to be pushed into the array.
         */
        addComponent(_component) {
            if (_component.getContainer() == this)
                return;
            if (this.components[_component.type] === undefined)
                this.components[_component.type] = [_component];
            else if (_component.isSingleton)
                throw new Error("Component is marked singleton and can't be attached, no more than one allowed");
            else
                this.components[_component.type].push(_component);
            _component.setContainer(this);
            _component.dispatchEvent(new Event("componentAdd" /* COMPONENT_ADD */));
        }
        /**
         * Removes the given component from the node, if it was attached, and sets its parent to null.
         * @param _component The component to be removed
         * @throws Exception when component is not found
         */
        removeComponent(_component) {
            try {
                let componentsOfType = this.components[_component.type];
                let foundAt = componentsOfType.indexOf(_component);
                if (foundAt < 0)
                    return;
                componentsOfType.splice(foundAt, 1);
                _component.setContainer(null);
                _component.dispatchEvent(new Event("componentRemove" /* COMPONENT_REMOVE */));
            }
            catch (_error) {
                throw new Error(`Unable to remove component '${_component}'in node named '${this.name}'`);
            }
        }
        // #endregion
        // #region Serialization
        serialize() {
            let serialization = {
                name: this.name
            };
            let components = {};
            for (let type in this.components) {
                components[type] = [];
                for (let component of this.components[type]) {
                    // components[type].push(component.serialize());
                    components[type].push(FudgeCore.Serializer.serialize(component));
                }
            }
            serialization["components"] = components;
            let children = [];
            for (let child of this.children) {
                children.push(FudgeCore.Serializer.serialize(child));
            }
            serialization["children"] = children;
            this.dispatchEvent(new Event("nodeSerialized" /* NODE_SERIALIZED */));
            return serialization;
        }
        deserialize(_serialization) {
            this.name = _serialization.name;
            // this.parent = is set when the nodes are added
            // deserialize components first so scripts can react to children being appended
            for (let type in _serialization.components) {
                for (let serializedComponent of _serialization.components[type]) {
                    let deserializedComponent = FudgeCore.Serializer.deserialize(serializedComponent);
                    this.addComponent(deserializedComponent);
                }
            }
            for (let serializedChild of _serialization.children) {
                let deserializedChild = FudgeCore.Serializer.deserialize(serializedChild);
                this.appendChild(deserializedChild);
            }
            this.dispatchEvent(new Event("nodeDeserialized" /* NODE_DESERIALIZED */));
            return this;
        }
        // #endregion
        // #region Events
        /**
         * Adds an event listener to the node. The given handler will be called when a matching event is passed to the node.
         * Deviating from the standard EventTarget, here the _handler must be a function and _capture is the only option.
         * @param _type The type of the event, should be an enumerated value of NODE_EVENT, can be any string
         * @param _handler The function to call when the event reaches this node
         * @param _capture When true, the listener listens in the capture phase, when the event travels deeper into the hierarchy of nodes.
         */
        addEventListener(_type, _handler, _capture = false) {
            if (_capture) {
                if (!this.captures[_type])
                    this.captures[_type] = [];
                this.captures[_type].push(_handler);
            }
            else {
                if (!this.listeners[_type])
                    this.listeners[_type] = [];
                this.listeners[_type].push(_handler);
            }
        }
        /**
         * Dispatches a synthetic event event to target. This implementation always returns true (standard: return true only if either event's cancelable attribute value is false or its preventDefault() method was not invoked)
         * The event travels into the hierarchy to this node dispatching the event, invoking matching handlers of the nodes ancestors listening to the capture phase,
         * than the matching handler of the target node in the target phase, and back out of the hierarchy in the bubbling phase, invoking appropriate handlers of the anvestors
         * @param _event The event to dispatch
         */
        dispatchEvent(_event) {
            let ancestors = [];
            let upcoming = this;
            // overwrite event target
            Object.defineProperty(_event, "target", { writable: true, value: this });
            // TODO: consider using Reflect instead of Object throughout. See also Render and Mutable...
            while (upcoming.parent)
                ancestors.push(upcoming = upcoming.parent);
            // capture phase
            Object.defineProperty(_event, "eventPhase", { writable: true, value: Event.CAPTURING_PHASE });
            for (let i = ancestors.length - 1; i >= 0; i--) {
                let ancestor = ancestors[i];
                Object.defineProperty(_event, "currentTarget", { writable: true, value: ancestor });
                let captures = ancestor.captures[_event.type] || [];
                for (let handler of captures)
                    handler(_event);
            }
            if (!_event.bubbles)
                return true;
            // target phase
            Object.defineProperty(_event, "eventPhase", { writable: true, value: Event.AT_TARGET });
            Object.defineProperty(_event, "currentTarget", { writable: true, value: this });
            let listeners = this.listeners[_event.type] || [];
            for (let handler of listeners)
                handler(_event);
            // bubble phase
            Object.defineProperty(_event, "eventPhase", { writable: true, value: Event.BUBBLING_PHASE });
            for (let i = 0; i < ancestors.length; i++) {
                let ancestor = ancestors[i];
                Object.defineProperty(_event, "currentTarget", { writable: true, value: ancestor });
                let listeners = ancestor.listeners[_event.type] || [];
                for (let handler of listeners)
                    handler(_event);
            }
            return true; //TODO: return a meaningful value, see documentation of dispatch event
        }
        /**
         * Broadcasts a synthetic event event to this node and from there to all nodes deeper in the hierarchy,
         * invoking matching handlers of the nodes listening to the capture phase. Watch performance when there are many nodes involved
         * @param _event The event to broadcast
         */
        broadcastEvent(_event) {
            // overwrite event target and phase
            Object.defineProperty(_event, "eventPhase", { writable: true, value: Event.CAPTURING_PHASE });
            Object.defineProperty(_event, "target", { writable: true, value: this });
            this.broadcastEventRecursive(_event);
        }
        broadcastEventRecursive(_event) {
            // capture phase only
            Object.defineProperty(_event, "currentTarget", { writable: true, value: this });
            let captures = this.captures[_event.type] || [];
            for (let handler of captures)
                handler(_event);
            // appears to be slower, astonishingly...
            // captures.forEach(function (handler: Function): void {
            //     handler(_event);
            // });
            // same for children
            for (let child of this.children) {
                child.broadcastEventRecursive(_event);
            }
        }
        // #endregion
        /**
         * Sets the parent of this node to be the supplied node. Will be called on the child that is appended to this node by appendChild().
         * @param _parent The parent to be set for this node.
         */
        setParent(_parent) {
            this.parent = _parent;
        }
        *getBranchGenerator() {
            yield this;
            for (let child of this.children)
                yield* child.branch;
        }
    }
    FudgeCore.Node = Node;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * A node managed by [[ResourceManager]] that functions as a template for [[NodeResourceInstance]]s
     */
    class NodeResource extends FudgeCore.Node {
        constructor() {
            super(...arguments);
            this.idResource = undefined;
        }
    }
    FudgeCore.NodeResource = NodeResource;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * An instance of a [[NodeResource]].
     * This node keeps a reference to its resource an can thus optimize serialization
     */
    class NodeResourceInstance extends FudgeCore.Node {
        constructor(_nodeResource) {
            super("NodeResourceInstance");
            /** id of the resource that instance was created from */
            // TODO: examine, if this should be a direct reference to the NodeResource, instead of the id
            this.idSource = undefined;
            if (_nodeResource)
                this.set(_nodeResource);
        }
        /**
         * Recreate this node from the [[NodeResource]] referenced
         */
        reset() {
            let resource = FudgeCore.ResourceManager.get(this.idSource);
            this.set(resource);
        }
        //TODO: optimize using the referenced NodeResource, serialize/deserialize only the differences
        serialize() {
            let serialization = super.serialize();
            serialization.idSource = this.idSource;
            return serialization;
        }
        deserialize(_serialization) {
            super.deserialize(_serialization);
            this.idSource = _serialization.idSource;
            return this;
        }
        /**
         * Set this node to be a recreation of the [[NodeResource]] given
         * @param _nodeResource
         */
        set(_nodeResource) {
            // TODO: examine, if the serialization should be stored in the NodeResource for optimization
            let serialization = FudgeCore.Serializer.serialize(_nodeResource);
            //Serializer.deserialize(serialization);
            for (let path in serialization) {
                this.deserialize(serialization[path]);
                break;
            }
            this.idSource = _nodeResource.idResource;
            this.dispatchEvent(new Event("nodeResourceInstantiated" /* NODERESOURCE_INSTANTIATED */));
        }
    }
    FudgeCore.NodeResourceInstance = NodeResourceInstance;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class Ray {
        constructor(_direction = FudgeCore.Vector3.Z(-1), _origin = FudgeCore.Vector3.ZERO(), _length = 1) {
            this.origin = _origin;
            this.direction = _direction;
            this.length = _length;
        }
    }
    FudgeCore.Ray = Ray;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class RayHit {
        constructor(_node = null, _face = 0, _zBuffer = 0) {
            this.node = _node;
            this.face = _face;
            this.zBuffer = _zBuffer;
        }
    }
    FudgeCore.RayHit = RayHit;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="RenderOperator.ts"/>
var FudgeCore;
/// <reference path="RenderOperator.ts"/>
(function (FudgeCore) {
    /**
     * This class manages the references to render data used by nodes.
     * Multiple nodes may refer to the same data via their references to shader, coat and mesh
     */
    class Reference {
        constructor(_reference) {
            this.count = 0;
            this.reference = _reference;
        }
        getReference() {
            return this.reference;
        }
        increaseCounter() {
            this.count++;
            return this.count;
        }
        decreaseCounter() {
            if (this.count == 0)
                throw (new Error("Negative reference counter"));
            this.count--;
            return this.count;
        }
    }
    /**
     * Manages the handling of the ressources that are going to be rendered by [[RenderOperator]].
     * Stores the references to the shader, the coat and the mesh used for each node registered.
     * With these references, the already buffered data is retrieved when rendering.
     */
    class RenderManager extends FudgeCore.RenderOperator {
        // #region Adding
        /**
         * Register the node for rendering. Create a reference for it and increase the matching render-data references or create them first if necessary
         * @param _node
         */
        static addNode(_node) {
            if (RenderManager.nodes.get(_node))
                return;
            let cmpMaterial = _node.getComponent(FudgeCore.ComponentMaterial);
            if (!cmpMaterial)
                return;
            let shader = cmpMaterial.material.getShader();
            RenderManager.createReference(RenderManager.renderShaders, shader, RenderManager.createProgram);
            let coat = cmpMaterial.material.getCoat();
            RenderManager.createReference(RenderManager.renderCoats, coat, RenderManager.createParameter);
            let mesh = _node.getComponent(FudgeCore.ComponentMesh).mesh;
            RenderManager.createReference(RenderManager.renderBuffers, mesh, RenderManager.createBuffers);
            let nodeReferences = { shader: shader, coat: coat, mesh: mesh }; //, doneTransformToWorld: false };
            RenderManager.nodes.set(_node, nodeReferences);
        }
        /**
         * Register the node and its valid successors in the branch for rendering using [[addNode]]
         * @param _node
         * @returns false, if the given node has a current timestamp thus having being processed during latest RenderManager.update and no addition is needed
         */
        static addBranch(_node) {
            // TODO: rethink optimization!!
            // if (_node.isUpdated(RenderManager.timestampUpdate))
            //     return false;
            for (let node of _node.branch)
                try {
                    // may fail when some components are missing. TODO: cleanup
                    RenderManager.addNode(node);
                }
                catch (_error) {
                    FudgeCore.Debug.log(_error);
                }
            return true;
        }
        // #endregion
        // #region Removing
        /**
         * Unregister the node so that it won't be rendered any more. Decrease the render-data references and delete the node reference.
         * @param _node
         */
        static removeNode(_node) {
            let nodeReferences = RenderManager.nodes.get(_node);
            if (!nodeReferences)
                return;
            RenderManager.removeReference(RenderManager.renderShaders, nodeReferences.shader, RenderManager.deleteProgram);
            RenderManager.removeReference(RenderManager.renderCoats, nodeReferences.coat, RenderManager.deleteParameter);
            RenderManager.removeReference(RenderManager.renderBuffers, nodeReferences.mesh, RenderManager.deleteBuffers);
            RenderManager.nodes.delete(_node);
        }
        /**
         * Unregister the node and its valid successors in the branch to free renderer resources. Uses [[removeNode]]
         * @param _node
         */
        static removeBranch(_node) {
            for (let node of _node.branch)
                RenderManager.removeNode(node);
        }
        // #endregion
        // #region Updating
        /**
         * Reflect changes in the node concerning shader, coat and mesh, manage the render-data references accordingly and update the node references
         * @param _node
         */
        static updateNode(_node) {
            let nodeReferences = RenderManager.nodes.get(_node);
            if (!nodeReferences)
                return;
            let cmpMaterial = _node.getComponent(FudgeCore.ComponentMaterial);
            let shader = cmpMaterial.material.getShader();
            if (shader !== nodeReferences.shader) {
                RenderManager.removeReference(RenderManager.renderShaders, nodeReferences.shader, RenderManager.deleteProgram);
                RenderManager.createReference(RenderManager.renderShaders, shader, RenderManager.createProgram);
                nodeReferences.shader = shader;
            }
            let coat = cmpMaterial.material.getCoat();
            if (coat !== nodeReferences.coat) {
                RenderManager.removeReference(RenderManager.renderCoats, nodeReferences.coat, RenderManager.deleteParameter);
                RenderManager.createReference(RenderManager.renderCoats, coat, RenderManager.createParameter);
                nodeReferences.coat = coat;
            }
            let mesh = (_node.getComponent(FudgeCore.ComponentMesh)).mesh;
            if (mesh !== nodeReferences.mesh) {
                RenderManager.removeReference(RenderManager.renderBuffers, nodeReferences.mesh, RenderManager.deleteBuffers);
                RenderManager.createReference(RenderManager.renderBuffers, mesh, RenderManager.createBuffers);
                nodeReferences.mesh = mesh;
            }
        }
        /**
         * Update the node and its valid successors in the branch using [[updateNode]]
         * @param _node
         */
        static updateBranch(_node) {
            for (let node of _node.branch)
                RenderManager.updateNode(node);
        }
        // #endregion
        // #region Lights
        /**
         * Viewports collect the lights relevant to the branch to render and calls setLights to pass the collection.
         * RenderManager passes it on to all shaders used that can process light
         * @param _lights
         */
        static setLights(_lights) {
            // let renderLights: RenderLights = RenderManager.createRenderLights(_lights);
            for (let entry of RenderManager.renderShaders) {
                let renderShader = entry[1].getReference();
                RenderManager.setLightsInShader(renderShader, _lights);
            }
            // debugger;
        }
        // #endregion
        // #region Rendering
        /**
         * Update all render data. After RenderManager, multiple viewports can render their associated data without updating the same data multiple times
         */
        static update() {
            RenderManager.timestampUpdate = performance.now();
            RenderManager.recalculateAllNodeTransforms();
        }
        /**
         * Clear the offscreen renderbuffer with the given [[Color]]
         * @param _color
         */
        static clear(_color = null) {
            RenderManager.crc3.clearColor(_color.r, _color.g, _color.b, _color.a);
            RenderManager.crc3.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        }
        /**
         * Reset the offscreen framebuffer to the original RenderingContext
         */
        static resetFrameBuffer(_color = null) {
            RenderManager.crc3.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, null);
        }
        /**
         * Draws the branch starting with the given [[Node]] using the camera given [[ComponentCamera]].
         * @param _node
         * @param _cmpCamera
         */
        static drawBranch(_node, _cmpCamera, _drawNode = RenderManager.drawNode) {
            if (_drawNode == RenderManager.drawNode)
                RenderManager.resetFrameBuffer();
            let finalTransform;
            let cmpMesh = _node.getComponent(FudgeCore.ComponentMesh);
            if (cmpMesh)
                finalTransform = FudgeCore.Matrix4x4.MULTIPLICATION(_node.mtxWorld, cmpMesh.pivot);
            else
                finalTransform = _node.mtxWorld; // caution, RenderManager is a reference...
            // multiply camera matrix
            let projection = FudgeCore.Matrix4x4.MULTIPLICATION(_cmpCamera.ViewProjectionMatrix, finalTransform);
            _drawNode(_node, finalTransform, projection);
            for (let name in _node.getChildren()) {
                let childNode = _node.getChildren()[name];
                RenderManager.drawBranch(childNode, _cmpCamera, _drawNode); //, world);
            }
            FudgeCore.Recycler.store(projection);
            if (finalTransform != _node.mtxWorld)
                FudgeCore.Recycler.store(finalTransform);
        }
        //#region RayCast & Picking
        /**
         * Draws the branch for RayCasting starting with the given [[Node]] using the camera given [[ComponentCamera]].
         * @param _node
         * @param _cmpCamera
         */
        static drawBranchForRayCast(_node, _cmpCamera) {
            RenderManager.pickBuffers = [];
            if (!RenderManager.renderShaders.get(FudgeCore.ShaderRayCast))
                RenderManager.createReference(RenderManager.renderShaders, FudgeCore.ShaderRayCast, RenderManager.createProgram);
            RenderManager.drawBranch(_node, _cmpCamera, RenderManager.drawNodeForRayCast);
            RenderManager.resetFrameBuffer();
            return RenderManager.pickBuffers;
        }
        static pickNodeAt(_pos, _pickBuffers, _rect) {
            let hits = [];
            for (let pickBuffer of _pickBuffers) {
                RenderManager.crc3.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, pickBuffer.frameBuffer);
                // TODO: instead of reading all data and afterwards pick the pixel, read only the pixel!
                let data = new Uint8Array(_rect.width * _rect.height * 4);
                RenderManager.crc3.readPixels(0, 0, _rect.width, _rect.height, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE, data);
                let pixel = _pos.x + _rect.width * _pos.y;
                let zBuffer = data[4 * pixel + 2] + data[4 * pixel + 3] / 256;
                let hit = new FudgeCore.RayHit(pickBuffer.node, 0, zBuffer);
                hits.push(hit);
            }
            return hits;
        }
        static drawNode(_node, _finalTransform, _projection) {
            let references = RenderManager.nodes.get(_node);
            if (!references)
                return; // TODO: deal with partial references
            let bufferInfo = RenderManager.renderBuffers.get(references.mesh).getReference();
            let coatInfo = RenderManager.renderCoats.get(references.coat).getReference();
            let shaderInfo = RenderManager.renderShaders.get(references.shader).getReference();
            RenderManager.draw(shaderInfo, bufferInfo, coatInfo, _finalTransform, _projection);
        }
        static drawNodeForRayCast(_node, _finalTransform, _projection) {
            // TODO: look into SSBOs!
            let target = RenderManager.getRayCastTexture();
            const framebuffer = RenderManager.crc3.createFramebuffer();
            // render to our targetTexture by binding the framebuffer
            RenderManager.crc3.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, framebuffer);
            // attach the texture as the first color attachment
            const attachmentPoint = WebGL2RenderingContext.COLOR_ATTACHMENT0;
            RenderManager.crc3.framebufferTexture2D(WebGL2RenderingContext.FRAMEBUFFER, attachmentPoint, WebGL2RenderingContext.TEXTURE_2D, target, 0);
            // set render target
            let references = RenderManager.nodes.get(_node);
            if (!references)
                return; // TODO: deal with partial references
            let pickBuffer = { node: _node, texture: target, frameBuffer: framebuffer };
            RenderManager.pickBuffers.push(pickBuffer);
            let bufferInfo = RenderManager.renderBuffers.get(references.mesh).getReference();
            RenderManager.drawForRayCast(RenderManager.pickBuffers.length, bufferInfo, _finalTransform, _projection);
            // make texture available to onscreen-display
            // IDEA: Iterate over textures, collect data if z indicates hit, sort by z
        }
        static getRayCastTexture() {
            // create to render to
            const targetTextureWidth = RenderManager.getViewportRectangle().width;
            const targetTextureHeight = RenderManager.getViewportRectangle().height;
            const targetTexture = RenderManager.crc3.createTexture();
            RenderManager.crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, targetTexture);
            {
                const internalFormat = WebGL2RenderingContext.RGBA8;
                const format = WebGL2RenderingContext.RGBA;
                const type = WebGL2RenderingContext.UNSIGNED_BYTE;
                RenderManager.crc3.texImage2D(WebGL2RenderingContext.TEXTURE_2D, 0, internalFormat, targetTextureWidth, targetTextureHeight, 0, format, type, null);
                // set the filtering so we don't need mips
                RenderManager.crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.LINEAR);
                RenderManager.crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_S, WebGL2RenderingContext.CLAMP_TO_EDGE);
                RenderManager.crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_T, WebGL2RenderingContext.CLAMP_TO_EDGE);
            }
            return targetTexture;
        }
        //#endregion
        //#region Transformation of branch
        /**
         * Recalculate the world matrix of all registered nodes respecting their hierarchical relation.
         */
        static recalculateAllNodeTransforms() {
            // inner function to be called in a for each node at the bottom of RenderManager function
            // function markNodeToBeTransformed(_nodeReferences: NodeReferences, _node: Node, _map: MapNodeToNodeReferences): void {
            //     _nodeReferences.doneTransformToWorld = false;
            // }
            // inner function to be called in a for each node at the bottom of RenderManager function
            let recalculateBranchContainingNode = (_nodeReferences, _node, _map) => {
                // find uppermost ancestor not recalculated yet
                let ancestor = _node;
                let parent;
                while (true) {
                    parent = ancestor.getParent();
                    if (!parent)
                        break;
                    if (_node.isUpdated(RenderManager.timestampUpdate))
                        break;
                    ancestor = parent;
                }
                // TODO: check if nodes without meshes must be registered
                // use the ancestors parent world matrix to start with, or identity if no parent exists or it's missing a ComponenTransform
                let matrix = FudgeCore.Matrix4x4.IDENTITY;
                if (parent)
                    matrix = parent.mtxWorld;
                // start recursive recalculation of the whole branch starting from the ancestor found
                RenderManager.recalculateTransformsOfNodeAndChildren(ancestor, matrix);
            };
            // call the functions above for each registered node
            // RenderManager.nodes.forEach(markNodeToBeTransformed);
            RenderManager.nodes.forEach(recalculateBranchContainingNode);
        }
        /**
         * Recursive method receiving a childnode and its parents updated world transform.
         * If the childnode owns a ComponentTransform, its worldmatrix is recalculated and passed on to its children, otherwise its parents matrix
         * @param _node
         * @param _world
         */
        static recalculateTransformsOfNodeAndChildren(_node, _world) {
            let world = _world;
            let cmpTransform = _node.cmpTransform;
            if (cmpTransform)
                world = FudgeCore.Matrix4x4.MULTIPLICATION(_world, cmpTransform.local);
            _node.mtxWorld = world;
            _node.timestampUpdate = RenderManager.timestampUpdate;
            for (let child of _node.getChildren()) {
                RenderManager.recalculateTransformsOfNodeAndChildren(child, world);
            }
        }
        // #endregion
        // #region Manage references to render data
        /**
         * Removes a reference to a program, parameter or buffer by decreasing its reference counter and deleting it, if the counter reaches 0
         * @param _in
         * @param _key
         * @param _deletor
         */
        static removeReference(_in, _key, _deletor) {
            let reference;
            reference = _in.get(_key);
            if (reference.decreaseCounter() == 0) {
                // The following deletions may be an optimization, not necessary to start with and maybe counterproductive.
                // If data should be used later again, it must then be reconstructed...
                _deletor(reference.getReference());
                _in.delete(_key);
            }
        }
        /**
         * Increases the counter of the reference to a program, parameter or buffer. Creates the reference, if it's not existent.
         * @param _in
         * @param _key
         * @param _creator
         */
        static createReference(_in, _key, _creator) {
            let reference;
            reference = _in.get(_key);
            if (reference)
                reference.increaseCounter();
            else {
                let content = _creator(_key);
                reference = new Reference(content);
                reference.increaseCounter();
                _in.set(_key, reference);
            }
        }
    }
    /** Stores references to the compiled shader programs and makes them available via the references to shaders */
    RenderManager.renderShaders = new Map();
    /** Stores references to the vertex array objects and makes them available via the references to coats */
    RenderManager.renderCoats = new Map();
    /** Stores references to the vertex buffers and makes them available via the references to meshes */
    RenderManager.renderBuffers = new Map();
    RenderManager.nodes = new Map();
    FudgeCore.RenderManager = RenderManager;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Coat/Coat.ts"/>
var FudgeCore;
/// <reference path="../Coat/Coat.ts"/>
(function (FudgeCore) {
    /**
     * Static superclass for the representation of WebGl shaderprograms.
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    // TODO: define attribute/uniforms as layout and use those consistently in shaders
    class Shader {
        /** The type of coat that can be used with this shader to create a material */
        static getCoat() { return null; }
        static getVertexShaderSource() { return null; }
        static getFragmentShaderSource() { return null; }
    }
    FudgeCore.Shader = Shader;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Single color shading
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderFlat extends FudgeCore.Shader {
        static getCoat() {
            return FudgeCore.CoatColored;
        }
        static getVertexShaderSource() {
            return `#version 300 es

                    struct LightAmbient {
                        vec4 color;
                    };
                    struct LightDirectional {
                        vec4 color;
                        vec3 direction;
                    };

                    const uint MAX_LIGHTS_DIRECTIONAL = 10u;

                    in vec3 a_position;
                    in vec3 a_normal;
                    uniform mat4 u_world;
                    uniform mat4 u_projection;

                    uniform LightAmbient u_ambient;
                    uniform uint u_nLightsDirectional;
                    uniform LightDirectional u_directional[MAX_LIGHTS_DIRECTIONAL];
                    flat out vec4 v_color;
                    
                    void main() {   
                        gl_Position = u_projection * vec4(a_position, 1.0);
                        vec3 normal = normalize(mat3(u_world) * a_normal);

                        v_color = u_ambient.color;
                        for (uint i = 0u; i < u_nLightsDirectional; i++) {
                            float illumination = -dot(normal, u_directional[i].direction);
                            if (illumination > 0.0f)
                                v_color += illumination * u_directional[i].color; // vec4(1,1,1,1); // 
                        }
                        //u_ambient;
                        //u_directional[0];
                    }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                    precision mediump float;

                    uniform vec4 u_color;
                    flat in vec4 v_color;
                    out vec4 frag;
                    
                    void main() {
                        frag = u_color * v_color;
                    }`;
        }
    }
    FudgeCore.ShaderFlat = ShaderFlat;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Matcap (Material Capture) shading. The texture provided by the coat is used as a matcap material.
     * Implementation based on https://www.clicktorelease.com/blog/creating-spherical-environment-mapping-shader/
     * @authors Simon Storl-Schulke, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderMatCap extends FudgeCore.Shader {
        static getCoat() {
            return FudgeCore.CoatMatCap;
        }
        static getVertexShaderSource() {
            return `#version 300 es

                    in vec3 a_position;
                    in vec3 a_normal;
                    uniform mat4 u_projection;

                    out vec2 tex_coords_smooth;
                    flat out vec2 tex_coords_flat;

                    void main() {
                        mat4 normalMatrix = transpose(inverse(u_projection));
                        vec4 p = vec4(a_position, 1.0);
                        vec4 normal4 = vec4(a_normal, 1.0);
                        vec3 e = normalize( vec3( u_projection * p ) );
                        vec3 n = normalize( vec3(normalMatrix * normal4) );

                        vec3 r = reflect( e, n );
                        float m = 2. * sqrt(
                            pow( r.x, 2. ) +
                            pow( r.y, 2. ) +
                            pow( r.z + 1., 2. )
                        );

                        tex_coords_smooth = r.xy / m + .5;
                        tex_coords_flat = r.xy / m + .5;

                        gl_Position = u_projection * vec4(a_position, 1.0);
                    }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                    precision mediump float;
                    
                    uniform vec4 u_tint_color;
                    uniform float u_flatmix;
                    uniform sampler2D u_texture;
                    
                    in vec2 tex_coords_smooth;
                    flat in vec2 tex_coords_flat;

                    out vec4 frag;

                    void main() {
                        vec2 tc = mix(tex_coords_smooth, tex_coords_flat, u_flatmix);
                        frag = u_tint_color * texture(u_texture, tc) * 2.0;
                    }`;
        }
    }
    FudgeCore.ShaderMatCap = ShaderMatCap;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Renders for Raycasting
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderRayCast extends FudgeCore.Shader {
        static getVertexShaderSource() {
            return `#version 300 es

                    in vec3 a_position;
                    uniform mat4 u_projection;
                    
                    void main() {   
                        gl_Position = u_projection * vec4(a_position, 1.0);
                    }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                    precision mediump float;
                    precision highp int;
                    
                    uniform int u_id;
                    out vec4 frag;
                    
                    void main() {
                       float id = float(u_id)/ 256.0;
                       float upperbyte = trunc(gl_FragCoord.z * 256.0) / 256.0;
                       float lowerbyte = fract(gl_FragCoord.z * 256.0);
                       frag = vec4(id, id, upperbyte , lowerbyte);
                    }`;
        }
    }
    FudgeCore.ShaderRayCast = ShaderRayCast;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Textured shading
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderTexture extends FudgeCore.Shader {
        static getCoat() {
            return FudgeCore.CoatTextured;
        }
        static getVertexShaderSource() {
            return `#version 300 es

                in vec3 a_position;
                in vec2 a_textureUVs;
                uniform mat4 u_projection;
                uniform vec4 u_color;
                out vec2 v_textureUVs;

                void main() {  
                    gl_Position = u_projection * vec4(a_position, 1.0);
                    v_textureUVs = a_textureUVs;
                }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                precision mediump float;
                
                in vec2 v_textureUVs;
                uniform sampler2D u_texture;
                out vec4 frag;
                
                void main() {
                    frag = texture(u_texture, v_textureUVs);
            }`;
        }
    }
    FudgeCore.ShaderTexture = ShaderTexture;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Single color shading
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderUniColor extends FudgeCore.Shader {
        static getCoat() {
            return FudgeCore.CoatColored;
        }
        static getVertexShaderSource() {
            return `#version 300 es

                    in vec3 a_position;
                    uniform mat4 u_projection;
                    
                    void main() {   
                        gl_Position = u_projection * vec4(a_position, 1.0);
                    }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                    precision mediump float;
                    
                    uniform vec4 u_color;
                    out vec4 frag;
                    
                    void main() {
                       frag = u_color;
                    }`;
        }
    }
    FudgeCore.ShaderUniColor = ShaderUniColor;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Baseclass for different kinds of textures.
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Texture extends FudgeCore.Mutable {
        reduceMutator() { }
    }
    FudgeCore.Texture = Texture;
    /**
     * Texture created from an existing image
     */
    class TextureImage extends Texture {
        constructor() {
            super(...arguments);
            this.image = null;
        }
    }
    FudgeCore.TextureImage = TextureImage;
    /**
     * Texture created from a canvas
     */
    class TextureCanvas extends Texture {
    }
    FudgeCore.TextureCanvas = TextureCanvas;
    /**
     * Texture created from a FUDGE-Sketch
     */
    class TextureSketch extends TextureCanvas {
    }
    FudgeCore.TextureSketch = TextureSketch;
    /**
     * Texture created from an HTML-page
     */
    class TextureHTML extends TextureCanvas {
    }
    FudgeCore.TextureHTML = TextureHTML;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Instances of this class generate a timestamp that correlates with the time elapsed since the start of the program but allows for resetting and scaling.
     * Supports interval- and timeout-callbacks identical with standard Javascript but with respect to the scaled time
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Time extends FudgeCore.EventTargetƒ {
        constructor() {
            super();
            this.timers = {};
            this.idTimerNext = 0;
            this.start = performance.now();
            this.scale = 1.0;
            this.offset = 0.0;
            this.lastCallToElapsed = 0.0;
        }
        /**
         * Returns the game-time-object which starts automatically and serves as base for various internal operations.
         */
        static get game() {
            return Time.gameTime;
        }
        /**
         * Retrieves the current scaled timestamp of this instance in milliseconds
         */
        get() {
            return this.offset + this.scale * (performance.now() - this.start);
        }
        /**
         * (Re-) Sets the timestamp of this instance
         * @param _time The timestamp to represent the current time (default 0.0)
         */
        set(_time = 0) {
            this.offset = _time;
            this.start = performance.now();
            this.getElapsedSincePreviousCall();
        }
        /**
         * Sets the scaling of this time, allowing for slowmotion (<1) or fastforward (>1)
         * @param _scale The desired scaling (default 1.0)
         */
        setScale(_scale = 1.0) {
            this.set(this.get());
            this.scale = _scale;
            //TODO: catch scale=0
            this.rescaleAllTimers();
            this.getElapsedSincePreviousCall();
            this.dispatchEvent(new Event("timeScaled" /* TIME_SCALED */));
        }
        /**
         * Retrieves the current scaling of this time
         */
        getScale() {
            return this.scale;
        }
        /**
         * Retrieves the offset of this time
         */
        getOffset() {
            return this.offset;
        }
        /**
         * Retrieves the scaled time in milliseconds passed since the last call to this method
         * Automatically reset at every call to set(...) and setScale(...)
         */
        getElapsedSincePreviousCall() {
            let current = this.get();
            let elapsed = current - this.lastCallToElapsed;
            this.lastCallToElapsed = current;
            return elapsed;
        }
        //#region Timers
        // TODO: examine if web-workers would enhance performance here!
        /**
         * Stops and deletes all [[Timer]]s attached. Should be called before this Time-object leaves scope
         */
        clearAllTimers() {
            for (let id in this.timers) {
                this.deleteTimer(Number(id));
            }
        }
        /**
         * Recreates [[Timer]]s when scaling changes
         */
        rescaleAllTimers() {
            for (let id in this.timers) {
                let timer = this.timers[id];
                timer.clear();
                if (!this.scale)
                    // Time has stopped, no need to replace cleared timers
                    continue;
                this.timers[id] = FudgeCore.Timer.getRescaled(timer);
            }
        }
        /**
         * Deletes [[Timer]] found using the internal id of the connected interval-object
         * @param _id
         */
        deleteTimerByItsInternalId(_id) {
            for (let id in this.timers) {
                let timer = this.timers[id];
                if (timer.id == _id) {
                    timer.clear();
                    delete this.timers[id];
                }
            }
        }
        /**
         * Installs a timer at this time object
         * @param _lapse The object-time to elapse between the calls to _callback
         * @param _count The number of calls desired, 0 = Infinite
         * @param _callback The function to call each the given lapse has elapsed
         * @param _arguments Additional parameters to pass to callback function
         */
        setTimer(_lapse, _count, _callback, ..._arguments) {
            let timer = new FudgeCore.Timer(this, _lapse, _count, _callback, _arguments);
            this.timers[++this.idTimerNext] = timer;
            return this.idTimerNext;
        }
        /**
         * Deletes the timer with the id given by this time object
         */
        deleteTimer(_id) {
            this.timers[_id].clear();
            delete this.timers[_id];
        }
        /**
         * Returns a copy of the list of timers currently installed on this time object
         */
        getTimers() {
            let result = {};
            return Object.assign(result, this.timers);
        }
    }
    Time.gameTime = new Time();
    FudgeCore.Time = Time;
})(FudgeCore || (FudgeCore = {}));
///<reference path="../Event/Event.ts"/>
///<reference path="../Time/Time.ts"/>
var FudgeCore;
///<reference path="../Event/Event.ts"/>
///<reference path="../Time/Time.ts"/>
(function (FudgeCore) {
    let LOOP_MODE;
    (function (LOOP_MODE) {
        /** Loop cycles controlled by window.requestAnimationFrame */
        LOOP_MODE["FRAME_REQUEST"] = "frameRequest";
        /** Loop cycles with the given framerate in [[Time]].game */
        LOOP_MODE["TIME_GAME"] = "timeGame";
        /** Loop cycles with the given framerate in realtime, independent of [[Time]].game */
        LOOP_MODE["TIME_REAL"] = "timeReal";
    })(LOOP_MODE = FudgeCore.LOOP_MODE || (FudgeCore.LOOP_MODE = {}));
    /**
     * Core loop of a Fudge application. Initializes automatically and must be started explicitly.
     * It then fires [[EVENT]].LOOP\_FRAME to all added listeners at each frame
     */
    class Loop extends FudgeCore.EventTargetStatic {
        /**
         * Starts the loop with the given mode and fps
         * @param _mode
         * @param _fps Is only applicable in TIME-modes
         * @param _syncWithAnimationFrame Experimental and only applicable in TIME-modes. Should defer the loop-cycle until the next possible animation frame.
         */
        static start(_mode = LOOP_MODE.FRAME_REQUEST, _fps = 60, _syncWithAnimationFrame = false) {
            Loop.stop();
            Loop.timeStartGame = FudgeCore.Time.game.get();
            Loop.timeStartReal = performance.now();
            Loop.timeLastFrameGame = Loop.timeStartGame;
            Loop.timeLastFrameReal = Loop.timeStartReal;
            Loop.fpsDesired = (_mode == LOOP_MODE.FRAME_REQUEST) ? 60 : _fps;
            Loop.framesToAverage = Loop.fpsDesired;
            Loop.timeLastFrameGameAvg = Loop.timeLastFrameRealAvg = 1000 / Loop.fpsDesired;
            Loop.mode = _mode;
            Loop.syncWithAnimationFrame = _syncWithAnimationFrame;
            let log = `Loop starting in mode ${Loop.mode}`;
            if (Loop.mode != LOOP_MODE.FRAME_REQUEST)
                log += ` with attempted ${_fps} fps`;
            FudgeCore.Debug.log(log);
            switch (_mode) {
                case LOOP_MODE.FRAME_REQUEST:
                    Loop.loopFrame();
                    break;
                case LOOP_MODE.TIME_REAL:
                    Loop.idIntervall = window.setInterval(Loop.loopTime, 1000 / Loop.fpsDesired);
                    Loop.loopTime();
                    break;
                case LOOP_MODE.TIME_GAME:
                    Loop.idIntervall = FudgeCore.Time.game.setTimer(1000 / Loop.fpsDesired, 0, Loop.loopTime);
                    Loop.loopTime();
                    break;
                default:
                    break;
            }
            Loop.running = true;
        }
        /**
         * Stops the loop
         */
        static stop() {
            if (!Loop.running)
                return;
            switch (Loop.mode) {
                case LOOP_MODE.FRAME_REQUEST:
                    window.cancelAnimationFrame(Loop.idRequest);
                    break;
                case LOOP_MODE.TIME_REAL:
                    window.clearInterval(Loop.idIntervall);
                    window.cancelAnimationFrame(Loop.idRequest);
                    break;
                case LOOP_MODE.TIME_GAME:
                    FudgeCore.Time.game.deleteTimer(Loop.idIntervall);
                    window.cancelAnimationFrame(Loop.idRequest);
                    break;
                default:
                    break;
            }
            FudgeCore.Debug.log("Loop stopped!");
        }
        static getFpsGameAverage() {
            return 1000 / Loop.timeLastFrameGameAvg;
        }
        static getFpsRealAverage() {
            return 1000 / Loop.timeLastFrameRealAvg;
        }
        static loop() {
            let time;
            time = performance.now();
            Loop.timeFrameReal = time - Loop.timeLastFrameReal;
            Loop.timeLastFrameReal = time;
            time = FudgeCore.Time.game.get();
            Loop.timeFrameGame = time - Loop.timeLastFrameGame;
            Loop.timeLastFrameGame = time;
            Loop.timeLastFrameGameAvg = ((Loop.framesToAverage - 1) * Loop.timeLastFrameGameAvg + Loop.timeFrameGame) / Loop.framesToAverage;
            Loop.timeLastFrameRealAvg = ((Loop.framesToAverage - 1) * Loop.timeLastFrameRealAvg + Loop.timeFrameReal) / Loop.framesToAverage;
            let event = new Event("loopFrame" /* LOOP_FRAME */);
            Loop.targetStatic.dispatchEvent(event);
        }
        static loopFrame() {
            Loop.loop();
            Loop.idRequest = window.requestAnimationFrame(Loop.loopFrame);
        }
        static loopTime() {
            if (Loop.syncWithAnimationFrame)
                Loop.idRequest = window.requestAnimationFrame(Loop.loop);
            else
                Loop.loop();
        }
    }
    /** The gametime the loop was started, overwritten at each start */
    Loop.timeStartGame = 0;
    /** The realtime the loop was started, overwritten at each start */
    Loop.timeStartReal = 0;
    /** The gametime elapsed since the last loop cycle */
    Loop.timeFrameGame = 0;
    /** The realtime elapsed since the last loop cycle */
    Loop.timeFrameReal = 0;
    Loop.timeLastFrameGame = 0;
    Loop.timeLastFrameReal = 0;
    Loop.timeLastFrameGameAvg = 0;
    Loop.timeLastFrameRealAvg = 0;
    Loop.running = false;
    Loop.mode = LOOP_MODE.FRAME_REQUEST;
    Loop.idIntervall = 0;
    Loop.idRequest = 0;
    Loop.fpsDesired = 30;
    Loop.framesToAverage = 30;
    Loop.syncWithAnimationFrame = false;
    FudgeCore.Loop = Loop;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class Timer {
        constructor(_time, _elapse, _count, _callback, ..._arguments) {
            this.time = _time;
            this.elapse = _elapse;
            this.arguments = _arguments;
            // this.startTimeReal = performance.now();
            this.callback = _callback;
            this.count = _count;
            let scale = Math.abs(_time.getScale());
            if (!scale) {
                // Time is stopped, timer won't be active
                this.active = false;
                return;
            }
            this.timeoutReal = this.elapse / scale;
            // if (this.type == TIMER_TYPE.TIMEOUT) {
            //     let callback: Function = (): void => {
            //         _time.deleteTimerByInternalId(this.id);
            //         _callback(_arguments);
            //     };
            //     id = window.setTimeout(callback, this.timeoutReal);
            // }
            // else
            let callback = () => {
                _callback(this.arguments);
                if (this.count > 0)
                    if (--this.count == 0)
                        _time.deleteTimerByItsInternalId(this.idWindow);
            };
            this.idWindow = window.setInterval(callback, this.timeoutReal, _arguments);
            this.active = true;
        }
        static getRescaled(_timer) {
            // if (timer.type == TIMER_TYPE.TIMEOUT && timer.active)
            //     // for an active timeout-timer, calculate the remaining time to timeout
            //     timeout = (performance.now() - timer.startTimeReal) / timer.timeoutReal;
            let rescaled = new Timer(_timer.time, _timer.elapse, _timer.count, _timer.callback, _timer.arguments);
            return rescaled;
        }
        get id() {
            return this.idWindow;
        }
        clear() {
            // if (this.type == TIMER_TYPE.TIMEOUT) {
            //     if (this.active)
            //         // save remaining time to timeout as new timeout for restart
            //         this.timeout = this.timeout * (1 - (performance.now() - this.startTimeReal) / this.timeoutReal);
            //     window.clearTimeout(this.id);
            // }
            // else
            // TODO: reusing timer starts interval anew. Should be remaining interval as timeout, then starting interval anew 
            window.clearInterval(this.idWindow);
            this.active = false;
        }
    }
    FudgeCore.Timer = Timer;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Handles file transfer from a Fudge-Browserapp to the local filesystem without a local server.
     * Saves to the download-path given by the browser, loads from the player's choice.
     */
    class FileIoBrowserLocal extends FudgeCore.EventTargetStatic {
        // TODO: refactor to async function to be handled using promise, instead of using event target
        static load() {
            FileIoBrowserLocal.selector = document.createElement("input");
            FileIoBrowserLocal.selector.type = "file";
            FileIoBrowserLocal.selector.multiple = true;
            FileIoBrowserLocal.selector.hidden = true;
            FileIoBrowserLocal.selector.addEventListener("change", FileIoBrowserLocal.handleFileSelect);
            document.body.appendChild(FileIoBrowserLocal.selector);
            FileIoBrowserLocal.selector.click();
        }
        // TODO: refactor to async function to be handled using promise, instead of using event target
        static save(_toSave) {
            for (let filename in _toSave) {
                let content = _toSave[filename];
                let blob = new Blob([content], { type: "text/plain" });
                let url = window.URL.createObjectURL(blob);
                //*/ using anchor element for download
                let downloader;
                downloader = document.createElement("a");
                downloader.setAttribute("href", url);
                downloader.setAttribute("download", filename);
                document.body.appendChild(downloader);
                downloader.click();
                document.body.removeChild(downloader);
                window.URL.revokeObjectURL(url);
            }
            let event = new CustomEvent("fileSaved" /* FILE_SAVED */, { detail: { mapFilenameToContent: _toSave } });
            FileIoBrowserLocal.targetStatic.dispatchEvent(event);
        }
        static async handleFileSelect(_event) {
            console.log("-------------------------------- handleFileSelect");
            document.body.removeChild(FileIoBrowserLocal.selector);
            let fileList = _event.target.files;
            console.log(fileList, fileList.length);
            if (fileList.length == 0)
                return;
            let loaded = {};
            await FileIoBrowserLocal.loadFiles(fileList, loaded);
            let event = new CustomEvent("fileLoaded" /* FILE_LOADED */, { detail: { mapFilenameToContent: loaded } });
            FileIoBrowserLocal.targetStatic.dispatchEvent(event);
        }
        static async loadFiles(_fileList, _loaded) {
            for (let file of _fileList) {
                const content = await new Response(file).text();
                _loaded[file.name] = content;
            }
        }
    }
    FudgeCore.FileIoBrowserLocal = FileIoBrowserLocal;
})(FudgeCore || (FudgeCore = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnVkZ2VDb3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vU291cmNlL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHMiLCIuLi9Tb3VyY2UvRXZlbnQvRXZlbnQudHMiLCIuLi9Tb3VyY2UvVHJhbnNmZXIvTXV0YWJsZS50cyIsIi4uL1NvdXJjZS9BbmltYXRpb24vQW5pbWF0aW9uLnRzIiwiLi4vU291cmNlL0FuaW1hdGlvbi9BbmltYXRpb25GdW5jdGlvbi50cyIsIi4uL1NvdXJjZS9BbmltYXRpb24vQW5pbWF0aW9uS2V5LnRzIiwiLi4vU291cmNlL0FuaW1hdGlvbi9BbmltYXRpb25TZXF1ZW5jZS50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpby50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpb0RlbGF5LnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvRmlsdGVyLnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvTGlzdGVuZXIudHMiLCIuLi9Tb3VyY2UvQXVkaW8vQXVkaW9Mb2NhbGlzYXRpb24udHMiLCIuLi9Tb3VyY2UvQXVkaW8vQXVkaW9Pc2NpbGxhdG9yLnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvU2Vzc2lvbkRhdGEudHMiLCIuLi9Tb3VyY2UvQXVkaW8vQXVkaW9TZXR0aW5ncy50cyIsIi4uL1NvdXJjZS9SZW5kZXIvUmVuZGVySW5qZWN0b3IudHMiLCIuLi9Tb3VyY2UvUmVuZGVyL1JlbmRlck9wZXJhdG9yLnRzIiwiLi4vU291cmNlL0NvYXQvQ29hdC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50LnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRBbmltYXRvci50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50QXVkaW8udHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudEF1ZGlvTGlzdGVuZXIudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudENhbWVyYS50cyIsIi4uL1NvdXJjZS9MaWdodC9MaWdodC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50TGlnaHQudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudE1hdGVyaWFsLnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRNZXNoLnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRTY3JpcHQudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudFRyYW5zZm9ybS50cyIsIi4uL1NvdXJjZS9EZWJ1Zy9EZWJ1Z0ludGVyZmFjZXMudHMiLCIuLi9Tb3VyY2UvRGVidWcvRGVidWdUYXJnZXQudHMiLCIuLi9Tb3VyY2UvRGVidWcvRGVidWdBbGVydC50cyIsIi4uL1NvdXJjZS9EZWJ1Zy9EZWJ1Z0NvbnNvbGUudHMiLCIuLi9Tb3VyY2UvRGVidWcvRGVidWcudHMiLCIuLi9Tb3VyY2UvRGVidWcvRGVidWdEaWFsb2cudHMiLCIuLi9Tb3VyY2UvRGVidWcvRGVidWdUZXh0QXJlYS50cyIsIi4uL1NvdXJjZS9FbmdpbmUvQ29sb3IudHMiLCIuLi9Tb3VyY2UvRW5naW5lL01hdGVyaWFsLnRzIiwiLi4vU291cmNlL0VuZ2luZS9SZWN5Y2xlci50cyIsIi4uL1NvdXJjZS9FbmdpbmUvUmVzb3VyY2VNYW5hZ2VyLnRzIiwiLi4vU291cmNlL0VuZ2luZS9WaWV3cG9ydC50cyIsIi4uL1NvdXJjZS9FdmVudC9FdmVudEtleWJvYXJkLnRzIiwiLi4vU291cmNlL01hdGgvRnJhbWluZy50cyIsIi4uL1NvdXJjZS9NYXRoL01hdHJpeDN4My50cyIsIi4uL1NvdXJjZS9NYXRoL01hdHJpeDR4NC50cyIsIi4uL1NvdXJjZS9NYXRoL1JlY3RhbmdsZS50cyIsIi4uL1NvdXJjZS9NYXRoL1ZlY3RvcjIudHMiLCIuLi9Tb3VyY2UvTWF0aC9WZWN0b3IzLnRzIiwiLi4vU291cmNlL01lc2gvTWVzaC50cyIsIi4uL1NvdXJjZS9NZXNoL01lc2hDdWJlLnRzIiwiLi4vU291cmNlL01lc2gvTWVzaFB5cmFtaWQudHMiLCIuLi9Tb3VyY2UvTWVzaC9NZXNoUXVhZC50cyIsIi4uL1NvdXJjZS9Ob2RlL05vZGUudHMiLCIuLi9Tb3VyY2UvTm9kZS9Ob2RlUmVzb3VyY2UudHMiLCIuLi9Tb3VyY2UvTm9kZS9Ob2RlUmVzb3VyY2VJbnN0YW5jZS50cyIsIi4uL1NvdXJjZS9SYXkvUmF5LnRzIiwiLi4vU291cmNlL1JheS9SYXlIaXQudHMiLCIuLi9Tb3VyY2UvUmVuZGVyL1JlbmRlck1hbmFnZXIudHMiLCIuLi9Tb3VyY2UvU2hhZGVyL1NoYWRlci50cyIsIi4uL1NvdXJjZS9TaGFkZXIvU2hhZGVyRmxhdC50cyIsIi4uL1NvdXJjZS9TaGFkZXIvU2hhZGVyTWF0Q2FwLnRzIiwiLi4vU291cmNlL1NoYWRlci9TaGFkZXJSYXlDYXN0LnRzIiwiLi4vU291cmNlL1NoYWRlci9TaGFkZXJUZXh0dXJlLnRzIiwiLi4vU291cmNlL1NoYWRlci9TaGFkZXJVbmlDb2xvci50cyIsIi4uL1NvdXJjZS9UZXh0dXJlL1RleHR1cmUudHMiLCIuLi9Tb3VyY2UvVGltZS9UaW1lLnRzIiwiLi4vU291cmNlL1RpbWUvTG9vcC50cyIsIi4uL1NvdXJjZS9UaW1lL1RpbWVyLnRzIiwiLi4vU291cmNlL1RyYW5zZmVyL0ZpbGVJb0Jyb3dzZXJMb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUEsSUFBVSxTQUFTLENBdUxsQjtBQXZMRCxXQUFVLFNBQVM7SUFnQmY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTJCRztJQUNILE1BQXNCLFVBQVU7UUFJNUI7OztXQUdHO1FBQ0ksTUFBTSxDQUFDLGlCQUFpQixDQUFDLFVBQWtCO1lBQzlDLEtBQUssSUFBSSxJQUFJLElBQUksVUFBVSxDQUFDLFVBQVU7Z0JBQ2xDLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVO29CQUN6QyxPQUFPO1lBRWYsSUFBSSxJQUFJLEdBQVcsVUFBVSxDQUFDLGVBQWUsQ0FBQyxV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S0FBYSxDQUFDLEVBQUUsS0FBYSxDQUFDLEVBQUUsS0FBYSxDQUFDLEVBQUUsS0FBYSxDQUFDO1lBQ3RFLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRU0sTUFBTSxLQUFLLEtBQUssS0FBWSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLEtBQUssS0FBSyxLQUFZLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNELE1BQU0sS0FBSyxHQUFHLEtBQVksT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsTUFBTSxLQUFLLEtBQUssS0FBWSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLEtBQUssSUFBSSxLQUFZLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sS0FBSyxNQUFNLEtBQVksT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxLQUFLLElBQUksS0FBWSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRCxNQUFNLEtBQUssT0FBTyxLQUFZLE9BQU8sSUFBSSxL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RyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxD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LENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FDYjtnQkFDRSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRzthQUM5QyxDQUFDLENBQUM7WUFDTCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBRUQ7OztXQUdHO1FBQ0ksTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFrQjtZQUN4QyxJQUFJLENBQUMsR0FBaUIsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNuQyxJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUU5QixJQUFJLEVBQUUsR0FBVyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDO2dCQUNyRCxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFFekMsSUFBSSxFQUFFLEdBQVcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztnQkFDckQsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLElBQUksRUFBRSxHQUFXLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUM7Z0JBQ3RELENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztZQUMxQyxJQUFJLEVBQUUsR0FBVyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDO2dCQUN0RCxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFFMUMsSUFBSSxDQUFDLEdBQVcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBRWxFLHlDQUF5QztZQUN6QyxNQUFNLE1BQU0sR0FBYyxVQUFBLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7Z0JBQ2QsQ0FBQyxHQUFHLEVBQUU7Z0JBQ04sQ0FBQyxHQUFHLEVBQUU7Z0JBQ04sQ0FBQyxHQUFHLEVBQUU7Z0JBQ04sQ0FBQyxHQUFHLEVBQUU7Z0JBQ04sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDckYsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDckYsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDdkYsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDdkYsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDM0YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDM0YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDM0YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDM0YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDM0YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDM0YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FB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QixxQkF1RDlCLENBQUE7QUFDTCxDQUFDLEVBaEVTLFNBQVMsS0FBVCxTQUFTLFFBZ0VsQiIsInNvdXJjZXNDb250ZW50IjpbIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1hbnlcclxuICAgIGV4cG9ydCB0eXBlIEdlbmVyYWwgPSBhbnk7XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICBbdHlwZTogc3RyaW5nXTogR2VuZXJhbDtcclxuICAgIH1cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbjtcclxuICAgICAgICBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZTtcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgTmFtZXNwYWNlUmVnaXN0ZXIge1xyXG4gICAgICAgIFtuYW1lOiBzdHJpbmddOiBPYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIYW5kbGVzIHRoZSBleHRlcm5hbCBzZXJpYWxpemF0aW9uIGFuZCBkZXNlcmlhbGl6YXRpb24gb2YgW1tTZXJpYWxpemFibGVdXSBvYmplY3RzLiBUaGUgaW50ZXJuYWwgcHJvY2VzcyBpcyBoYW5kbGVkIGJ5IHRoZSBvYmplY3RzIHRoZW1zZWx2ZXMuICBcclxuICAgICAqIEEgW1tTZXJpYWxpemF0aW9uXV0gb2JqZWN0IGNhbiBiZSBjcmVhdGVkIGZyb20gYSBbW1NlcmlhbGl6YWJsZV1dIG9iamVjdCBhbmQgYSBKU09OLVN0cmluZyBtYXkgYmUgY3JlYXRlZCBmcm9tIHRoYXQuICBcclxuICAgICAqIFZpY2UgdmVyc2EsIGEgSlNPTi1TdHJpbmcgY2FuIGJlIHBhcnNlZCB0byBhIFtbU2VyaWFsaXphdGlvbl1dIHdoaWNoIGNhbiBiZSBkZXNlcmlhbGl6ZWQgdG8gYSBbW1NlcmlhbGl6YWJsZV1dIG9iamVjdC5cclxuICAgICAqIGBgYHBsYWludGV4dFxyXG4gICAgICogIFtTZXJpYWxpemFibGVdIOKGkiAoc2VyaWFsaXplKSDihpIgW1NlcmlhbGl6YXRpb25dIOKGkiAoc3RyaW5naWZ5KSAgXHJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4oaTXHJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3RyaW5nXVxyXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKGk1xyXG4gICAgICogIFtTZXJpYWxpemFibGVdIOKGkCAoZGVzZXJpYWxpemUpIOKGkCBbU2VyaWFsaXphdGlvbl0g4oaQIChwYXJzZSlcclxuICAgICAqIGBgYCAgICAgIFxyXG4gICAgICogV2hpbGUgdGhlIGludGVybmFsIHNlcmlhbGl6ZS9kZXNlcmlhbGl6ZSBtZXRob2RzIG9mIHRoZSBvYmplY3RzIGNhcmUgb2YgdGhlIHNlbGVjdGlvbiBvZiBpbmZvcm1hdGlvbiBuZWVkZWQgdG8gcmVjcmVhdGUgdGhlIG9iamVjdCBhbmQgaXRzIHN0cnVjdHVyZSwgIFxyXG4gICAgICogdGhlIFtbU2VyaWFsaXplcl1dIGtlZXBzIHRyYWNrIG9mIHRoZSBuYW1lc3BhY2VzIGFuZCBjbGFzc2VzIGluIG9yZGVyIHRvIHJlY3JlYXRlIFtbU2VyaWFsaXphYmxlXV0gb2JqZWN0cy4gVGhlIGdlbmVyYWwgc3RydWN0dXJlIG9mIGEgW1tTZXJpYWxpemF0aW9uXV0gaXMgYXMgZm9sbG93cyAgXHJcbiAgICAgKiBgYGBwbGFpbnRleHRcclxuICAgICAqIHtcclxuICAgICAqICAgICAgbmFtZXNwYWNlTmFtZS5jbGFzc05hbWU6IHtcclxuICAgICAqICAgICAgICAgIHByb3BlcnR5TmFtZTogcHJvcGVydHlWYWx1ZSxcclxuICAgICAqICAgICAgICAgIC4uLixcclxuICAgICAqICAgICAgICAgIHByb3BlcnR5TmFtZU9mUmVmZXJlbmNlOiBTZXJpYWxpemF0aW9uT2ZUaGVSZWZlcmVuY2VkT2JqZWN0LFxyXG4gICAgICogICAgICAgICAgLi4uLFxyXG4gICAgICogICAgICAgICAgY29uc3RydWN0b3JOYW1lT2ZTdXBlcmNsYXNzOiBTZXJpYWxpemF0aW9uT2ZTdXBlckNsYXNzXHJcbiAgICAgKiAgICAgIH1cclxuICAgICAqIH1cclxuICAgICAqIGBgYFxyXG4gICAgICogU2luY2UgdGhlIGluc3RhbmNlIG9mIHRoZSBzdXBlcmNsYXNzIGlzIGNyZWF0ZWQgYXV0b21hdGljYWxseSB3aGVuIGFuIG9iamVjdCBpcyBjcmVhdGVkLCBcclxuICAgICAqIHRoZSBTZXJpYWxpemF0aW9uT2ZTdXBlckNsYXNzIG9taXRzIHRoZSB0aGUgbmFtZXNwYWNlTmFtZS5jbGFzc05hbWUga2V5IGFuZCBjb25zaXN0cyBvbmx5IG9mIGl0cyB2YWx1ZS4gXHJcbiAgICAgKiBUaGUgY29uc3RydWN0b3JOYW1lT2ZTdXBlcmNsYXNzIGlzIGdpdmVuIGluc3RlYWQgYXMgYSBwcm9wZXJ0eSBuYW1lIGluIHRoZSBzZXJpYWxpemF0aW9uIG9mIHRoZSBzdWJjbGFzcy5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNlcmlhbGl6ZXIge1xyXG4gICAgICAgIC8qKiBJbiBvcmRlciBmb3IgdGhlIFNlcmlhbGl6ZXIgdG8gY3JlYXRlIGNsYXNzIGluc3RhbmNlcywgaXQgbmVlZHMgYWNjZXNzIHRvIHRoZSBhcHByb3ByaWF0ZSBuYW1lc3BhY2VzICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgbmFtZXNwYWNlczogTmFtZXNwYWNlUmVnaXN0ZXIgPSB7IFwixpJcIjogRnVkZ2VDb3JlIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJlZ2lzdGVycyBhIG5hbWVzcGFjZSB0byB0aGUgW1tTZXJpYWxpemVyXV0sIHRvIGVuYWJsZSBhdXRvbWF0aWMgaW5zdGFudGlhdGlvbiBvZiBjbGFzc2VzIGRlZmluZWQgd2l0aGluXHJcbiAgICAgICAgICogQHBhcmFtIF9uYW1lc3BhY2UgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyByZWdpc3Rlck5hbWVzcGFjZShfbmFtZXNwYWNlOiBPYmplY3QpOiB2b2lkIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBTZXJpYWxpemVyLm5hbWVzcGFjZXMpXHJcbiAgICAgICAgICAgICAgICBpZiAoU2VyaWFsaXplci5uYW1lc3BhY2VzW25hbWVdID09IF9uYW1lc3BhY2UpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5hbWU6IHN0cmluZyA9IFNlcmlhbGl6ZXIuZmluZE5hbWVzcGFjZUluKF9uYW1lc3BhY2UsIHdpbmRvdyk7XHJcbiAgICAgICAgICAgIGlmICghbmFtZSlcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHBhcmVudE5hbWUgaW4gU2VyaWFsaXplci5uYW1lc3BhY2VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IFNlcmlhbGl6ZXIuZmluZE5hbWVzcGFjZUluKF9uYW1lc3BhY2UsIFNlcmlhbGl6ZXIubmFtZXNwYWNlc1twYXJlbnROYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSA9IHBhcmVudE5hbWUgKyBcIi5cIiArIG5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghbmFtZSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5hbWVzcGFjZSBub3QgZm91bmQuIE1heWJlIHBhcmVudCBuYW1lc3BhY2UgaGFzbid0IGJlZW4gcmVnaXN0ZXJlZCBiZWZvcmU/XCIpO1xyXG5cclxuICAgICAgICAgICAgU2VyaWFsaXplci5uYW1lc3BhY2VzW25hbWVdID0gX25hbWVzcGFjZTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm5zIGEgamF2YXNjcmlwdCBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBzZXJpYWxpemFibGUgRlVER0Utb2JqZWN0IGdpdmVuLFxyXG4gICAgICAgICAqIGluY2x1ZGluZyBhdHRhY2hlZCBjb21wb25lbnRzLCBjaGlsZHJlbiwgc3VwZXJjbGFzcy1vYmplY3RzIGFsbCBpbmZvcm1hdGlvbiBuZWVkZWQgZm9yIHJlY29uc3RydWN0aW9uXHJcbiAgICAgICAgICogQHBhcmFtIF9vYmplY3QgQW4gb2JqZWN0IHRvIHNlcmlhbGl6ZSwgaW1wbGVtZW50aW5nIHRoZSBbW1NlcmlhbGl6YWJsZV1dIGludGVyZmFjZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc2VyaWFsaXplKF9vYmplY3Q6IFNlcmlhbGl6YWJsZSk6IFNlcmlhbGl6YXRpb24ge1xyXG4gICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHt9O1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBzYXZlIHRoZSBuYW1lc3BhY2Ugd2l0aCB0aGUgY29uc3RydWN0b3JzIG5hbWVcclxuICAgICAgICAgICAgLy8gc2VyaWFsaXphdGlvbltfb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWVdID0gX29iamVjdC5zZXJpYWxpemUoKTtcclxuICAgICAgICAgICAgbGV0IHBhdGg6IHN0cmluZyA9IHRoaXMuZ2V0RnVsbFBhdGgoX29iamVjdCk7XHJcbiAgICAgICAgICAgIGlmICghcGF0aClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTmFtZXNwYWNlIG9mIHNlcmlhbGl6YWJsZSBvYmplY3Qgb2YgdHlwZSAke19vYmplY3QuY29uc3RydWN0b3IubmFtZX0gbm90IGZvdW5kLiBNYXliZSB0aGUgbmFtZXNwYWNlIGhhc24ndCBiZWVuIHJlZ2lzdGVyZWQgb3IgdGhlIGNsYXNzIG5vdCBleHBvcnRlZD9gKTtcclxuICAgICAgICAgICAgc2VyaWFsaXphdGlvbltwYXRoXSA9IF9vYmplY3Quc2VyaWFsaXplKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xyXG4gICAgICAgICAgICAvLyByZXR1cm4gX29iamVjdC5zZXJpYWxpemUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgYSBGVURHRS1vYmplY3QgcmVjb25zdHJ1Y3RlZCBmcm9tIHRoZSBpbmZvcm1hdGlvbiBpbiB0aGUgW1tTZXJpYWxpemF0aW9uXV0gZ2l2ZW4sXHJcbiAgICAgICAgICogaW5jbHVkaW5nIGF0dGFjaGVkIGNvbXBvbmVudHMsIGNoaWxkcmVuLCBzdXBlcmNsYXNzLW9iamVjdHNcclxuICAgICAgICAgKiBAcGFyYW0gX3NlcmlhbGl6YXRpb24gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XHJcbiAgICAgICAgICAgIGxldCByZWNvbnN0cnVjdDogU2VyaWFsaXphYmxlO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgLy8gbG9vcCBjb25zdHJ1Y3RlZCBzb2xlbHkgdG8gYWNjZXNzIHR5cGUtcHJvcGVydHkuIE9ubHkgb25lIGV4cGVjdGVkIVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgcGF0aCBpbiBfc2VyaWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlY29uc3RydWN0ID0gbmV3ICg8R2VuZXJhbD5GdWRnZSlbdHlwZU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY29uc3RydWN0ID0gU2VyaWFsaXplci5yZWNvbnN0cnVjdChwYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICByZWNvbnN0cnVjdC5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbltwYXRoXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlY29uc3RydWN0O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChfZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRlc2VyaWFsaXphdGlvbiBmYWlsZWQ6IFwiICsgX2Vycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVE9ETzogaW1wbGVtZW50IHByZXR0aWZpZXIgdG8gbWFrZSBKU09OLVN0cmluZ2lmaWNhdGlvbiBvZiBzZXJpYWxpemF0aW9ucyBtb3JlIHJlYWRhYmxlLCBlLmcuIHBsYWNpbmcgeCwgeSBhbmQgeiBpbiBvbmUgbGluZVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgcHJldHRpZnkoX2pzb246IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBfanNvbjsgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm5zIGEgZm9ybWF0dGVkLCBodW1hbiByZWFkYWJsZSBKU09OLVN0cmluZywgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiBbW1NlcmlhbGl6YWlvbl1dIHRoYXQgbWF5IGhhdmUgYmVlbiBjcmVhdGVkIGJ5IFtbU2VyaWFsaXplcl1dLnNlcmlhbGl6ZVxyXG4gICAgICAgICAqIEBwYXJhbSBfc2VyaWFsaXphdGlvblxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc3RyaW5naWZ5KF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgLy8gYWRqdXN0bWVudHMgdG8gc2VyaWFsaXphdGlvbiBjYW4gYmUgbWFkZSBoZXJlIGJlZm9yZSBzdHJpbmdpZmljYXRpb24sIGlmIGRlc2lyZWRcclxuICAgICAgICAgICAgbGV0IGpzb246IHN0cmluZyA9IEpTT04uc3RyaW5naWZ5KF9zZXJpYWxpemF0aW9uLCBudWxsLCAyKTtcclxuICAgICAgICAgICAgbGV0IHByZXR0eTogc3RyaW5nID0gU2VyaWFsaXplci5wcmV0dGlmeShqc29uKTtcclxuICAgICAgICAgICAgcmV0dXJuIHByZXR0eTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgYSBbW1NlcmlhbGl6YXRpb25dXSBjcmVhdGVkIGZyb20gdGhlIGdpdmVuIEpTT04tU3RyaW5nLiBSZXN1bHQgbWF5IGJlIHBhc3NlZCB0byBbW1NlcmlhbGl6ZXJdXS5kZXNlcmlhbGl6ZVxyXG4gICAgICAgICAqIEBwYXJhbSBfanNvbiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIHBhcnNlKF9qc29uOiBzdHJpbmcpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoX2pzb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDcmVhdGVzIGFuIG9iamVjdCBvZiB0aGUgY2xhc3MgZGVmaW5lZCB3aXRoIHRoZSBmdWxsIHBhdGggaW5jbHVkaW5nIHRoZSBuYW1lc3BhY2VOYW1lKHMpIGFuZCB0aGUgY2xhc3NOYW1lIHNlcGVyYXRlZCBieSBkb3RzKC4pIFxyXG4gICAgICAgICAqIEBwYXJhbSBfcGF0aCBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyByZWNvbnN0cnVjdChfcGF0aDogc3RyaW5nKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgICAgICAgbGV0IHR5cGVOYW1lOiBzdHJpbmcgPSBfcGF0aC5zdWJzdHIoX3BhdGgubGFzdEluZGV4T2YoXCIuXCIpICsgMSk7XHJcbiAgICAgICAgICAgIGxldCBuYW1lc3BhY2U6IE9iamVjdCA9IFNlcmlhbGl6ZXIuZ2V0TmFtZXNwYWNlKF9wYXRoKTtcclxuICAgICAgICAgICAgaWYgKCFuYW1lc3BhY2UpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5hbWVzcGFjZSBvZiBzZXJpYWxpemFibGUgb2JqZWN0IG9mIHR5cGUgJHt0eXBlTmFtZX0gbm90IGZvdW5kLiBNYXliZSB0aGUgbmFtZXNwYWNlIGhhc24ndCBiZWVuIHJlZ2lzdGVyZWQ/YCk7XHJcbiAgICAgICAgICAgIGxldCByZWNvbnN0cnVjdGlvbjogU2VyaWFsaXphYmxlID0gbmV3ICg8R2VuZXJhbD5uYW1lc3BhY2UpW3R5cGVOYW1lXTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlY29uc3RydWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoZSBjbGFzcyBvZiB0aGUgb2JqZWN0LCBpZiBmb3VuZCBpbiB0aGUgcmVnaXN0ZXJlZCBuYW1lc3BhY2VzXHJcbiAgICAgICAgICogQHBhcmFtIF9vYmplY3QgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0RnVsbFBhdGgoX29iamVjdDogU2VyaWFsaXphYmxlKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgbGV0IHR5cGVOYW1lOiBzdHJpbmcgPSBfb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWU7XHJcbiAgICAgICAgICAgIC8vIERlYnVnLmxvZyhcIlNlYXJjaGluZyBuYW1lc3BhY2Ugb2Y6IFwiICsgdHlwZU5hbWUpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuYW1lc3BhY2VOYW1lIGluIFNlcmlhbGl6ZXIubmFtZXNwYWNlcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGZvdW5kOiBHZW5lcmFsID0gKDxHZW5lcmFsPlNlcmlhbGl6ZXIubmFtZXNwYWNlcylbbmFtZXNwYWNlTmFtZV1bdHlwZU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kICYmIF9vYmplY3QgaW5zdGFuY2VvZiBmb3VuZClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmFtZXNwYWNlTmFtZSArIFwiLlwiICsgdHlwZU5hbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm5zIHRoZSBuYW1lc3BhY2Utb2JqZWN0IGRlZmluZWQgd2l0aGluIHRoZSBmdWxsIHBhdGgsIGlmIHJlZ2lzdGVyZWRcclxuICAgICAgICAgKiBAcGFyYW0gX3BhdGhcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBnZXROYW1lc3BhY2UoX3BhdGg6IHN0cmluZyk6IE9iamVjdCB7XHJcbiAgICAgICAgICAgIGxldCBuYW1lc3BhY2VOYW1lOiBzdHJpbmcgPSBfcGF0aC5zdWJzdHIoMCwgX3BhdGgubGFzdEluZGV4T2YoXCIuXCIpKTtcclxuICAgICAgICAgICAgcmV0dXJuIFNlcmlhbGl6ZXIubmFtZXNwYWNlc1tuYW1lc3BhY2VOYW1lXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZpbmRzIHRoZSBuYW1lc3BhY2Utb2JqZWN0IGluIHByb3BlcnRpZXMgb2YgdGhlIHBhcmVudC1vYmplY3QgKGUuZy4gd2luZG93KSwgaWYgcHJlc2VudFxyXG4gICAgICAgICAqIEBwYXJhbSBfbmFtZXNwYWNlIFxyXG4gICAgICAgICAqIEBwYXJhbSBfcGFyZW50IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGZpbmROYW1lc3BhY2VJbihfbmFtZXNwYWNlOiBPYmplY3QsIF9wYXJlbnQ6IE9iamVjdCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHByb3AgaW4gX3BhcmVudClcclxuICAgICAgICAgICAgICAgIGlmICgoPEdlbmVyYWw+X3BhcmVudClbcHJvcF0gPT0gX25hbWVzcGFjZSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvcDtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIE1hcEV2ZW50VHlwZVRvTGlzdGVuZXIge1xyXG4gICAgICAgIFtldmVudFR5cGU6IHN0cmluZ106IEV2ZW50TGlzdGVuZXJbXTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFR5cGVzIG9mIGV2ZW50cyBzcGVjaWZpYyB0byBGdWRnZSwgaW4gYWRkaXRpb24gdG8gdGhlIHN0YW5kYXJkIERPTS9Ccm93c2VyLVR5cGVzIGFuZCBjdXN0b20gc3RyaW5nc1xyXG4gICAgICovXHJcbiAgICBleHBvcnQgY29uc3QgZW51bSBFVkVOVCB7XHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gdGFyZ2V0cyByZWdpc3RlcmVkIGF0IFtbTG9vcF1dLCB3aGVuIHJlcXVlc3RlZCBhbmltYXRpb24gZnJhbWUgc3RhcnRzICovXHJcbiAgICAgICAgTE9PUF9GUkFNRSA9IFwibG9vcEZyYW1lXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBbW0NvbXBvbmVudF1dIHdoZW4gaXRzIGJlaW5nIGFkZGVkIHRvIGEgW1tOb2RlXV0gKi9cclxuICAgICAgICBDT01QT05FTlRfQUREID0gXCJjb21wb25lbnRBZGRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBhIFtbQ29tcG9uZW50XV0gd2hlbiBpdHMgYmVpbmcgcmVtb3ZlZCBmcm9tIGEgW1tOb2RlXV0gKi9cclxuICAgICAgICBDT01QT05FTlRfUkVNT1ZFID0gXCJjb21wb25lbnRSZW1vdmVcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBhIFtbQ29tcG9uZW50XV0gd2hlbiBpdHMgYmVpbmcgYWN0aXZhdGVkICovXHJcbiAgICAgICAgQ09NUE9ORU5UX0FDVElWQVRFID0gXCJjb21wb25lbnRBY3RpdmF0ZVwiLFxyXG4gICAgICAgIC8qKiBkaXNwYXRjaGVkIHRvIGEgW1tDb21wb25lbnRdXSB3aGVuIGl0cyBiZWluZyBkZWFjdGl2YXRlZCAqL1xyXG4gICAgICAgIENPTVBPTkVOVF9ERUFDVElWQVRFID0gXCJjb21wb25lbnREZWFjdGl2YXRlXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBjaGlsZCBbW05vZGVdXSBhbmQgaXRzIGFuY2VzdG9ycyBhZnRlciBpdCB3YXMgYXBwZW5kZWQgdG8gYSBwYXJlbnQgKi9cclxuICAgICAgICBDSElMRF9BUFBFTkQgPSBcImNoaWxkQWRkXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBjaGlsZCBbW05vZGVdXSBhbmQgaXRzIGFuY2VzdG9ycyBqdXN0IGJlZm9yZSBpdHMgYmVpbmcgcmVtb3ZlZCBmcm9tIGl0cyBwYXJlbnQgKi9cclxuICAgICAgICBDSElMRF9SRU1PVkUgPSBcImNoaWxkUmVtb3ZlXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBbW011dGFibGVdXSB3aGVuIGl0cyBiZWluZyBtdXRhdGVkICovXHJcbiAgICAgICAgTVVUQVRFID0gXCJtdXRhdGVcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW1ZpZXdwb3J0XV0gd2hlbiBpdCBnZXRzIHRoZSBmb2N1cyB0byByZWNlaXZlIGtleWJvYXJkIGlucHV0ICovXHJcbiAgICAgICAgRk9DVVNfSU4gPSBcImZvY3VzaW5cIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW1ZpZXdwb3J0XV0gd2hlbiBpdCBsb3NlcyB0aGUgZm9jdXMgdG8gcmVjZWl2ZSBrZXlib2FyZCBpbnB1dCAqL1xyXG4gICAgICAgIEZPQ1VTX09VVCA9IFwiZm9jdXNvdXRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW05vZGVdXSB3aGVuIGl0J3MgZG9uZSBzZXJpYWxpemluZyAqL1xyXG4gICAgICAgIE5PREVfU0VSSUFMSVpFRCA9IFwibm9kZVNlcmlhbGl6ZWRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW05vZGVdXSB3aGVuIGl0J3MgZG9uZSBkZXNlcmlhbGl6aW5nLCBzbyBhbGwgY29tcG9uZW50cywgY2hpbGRyZW4gYW5kIGF0dHJpYnV0ZXMgYXJlIGF2YWlsYWJsZSAqL1xyXG4gICAgICAgIE5PREVfREVTRVJJQUxJWkVEID0gXCJub2RlRGVzZXJpYWxpemVkXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gW1tOb2RlUmVzb3VyY2VJbnN0YW5jZV1dIHdoZW4gaXQncyBjb250ZW50IGlzIHNldCBhY2NvcmRpbmcgdG8gYSBzZXJpYWxpemF0aW9uIG9mIGEgW1tOb2RlUmVzb3VyY2VdXSAgKi9cclxuICAgICAgICBOT0RFUkVTT1VSQ0VfSU5TVEFOVElBVEVEID0gXCJub2RlUmVzb3VyY2VJbnN0YW50aWF0ZWRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW1RpbWVdXSB3aGVuIGl0J3Mgc2NhbGluZyBjaGFuZ2VkICAqL1xyXG4gICAgICAgIFRJTUVfU0NBTEVEID0gXCJ0aW1lU2NhbGVkXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gW1tGaWxlSW9dXSB3aGVuIGEgbGlzdCBvZiBmaWxlcyBoYXMgYmVlbiBsb2FkZWQgICovXHJcbiAgICAgICAgRklMRV9MT0FERUQgPSBcImZpbGVMb2FkZWRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW0ZpbGVJb11dIHdoZW4gYSBsaXN0IG9mIGZpbGVzIGhhcyBiZWVuIHNhdmVkICovXHJcbiAgICAgICAgRklMRV9TQVZFRCA9IFwiZmlsZVNhdmVkXCJcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY29uc3QgZW51bSBFVkVOVF9QT0lOVEVSIHtcclxuICAgICAgICBVUCA9IFwixpJwb2ludGVydXBcIixcclxuICAgICAgICBET1dOID0gXCLGknBvaW50ZXJkb3duXCIsXHJcbiAgICAgICAgTU9WRSA9IFwixpJwb2ludGVybW92ZVwiLFxyXG4gICAgICAgIE9WRVIgPSBcIsaScG9pbnRlcm92ZXJcIixcclxuICAgICAgICBFTlRFUiA9IFwixpJwb2ludGVyZW50ZXJcIixcclxuICAgICAgICBDQU5DRUwgPSBcIsaScG9pbnRlcmNhbmNlbFwiLFxyXG4gICAgICAgIE9VVCA9IFwixpJwb2ludGVyb3V0XCIsXHJcbiAgICAgICAgTEVBVkUgPSBcIsaScG9pbnRlcmxlYXZlXCIsXHJcbiAgICAgICAgR09UQ0FQVFVSRSA9IFwixpJnb3Rwb2ludGVyY2FwdHVyZVwiLFxyXG4gICAgICAgIExPU1RDQVBUVVJFID0gXCLGkmxvc3Rwb2ludGVyY2FwdHVyZVwiXHJcbiAgICB9XHJcbiAgICBleHBvcnQgY29uc3QgZW51bSBFVkVOVF9EUkFHRFJPUCB7XHJcbiAgICAgICAgRFJBRyA9IFwixpJkcmFnXCIsXHJcbiAgICAgICAgRFJPUCA9IFwixpJkcm9wXCIsXHJcbiAgICAgICAgU1RBUlQgPSBcIsaSZHJhZ3N0YXJ0XCIsXHJcbiAgICAgICAgRU5EID0gXCLGkmRyYWdlbmRcIixcclxuICAgICAgICBPVkVSID0gXCLGkmRyYWdvdmVyXCJcclxuICAgIH1cclxuICAgIGV4cG9ydCBjb25zdCBlbnVtIEVWRU5UX1dIRUVMIHtcclxuICAgICAgICBXSEVFTCA9IFwixpJ3aGVlbFwiXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFBvaW50ZXJFdmVudMaSIGV4dGVuZHMgUG9pbnRlckV2ZW50IHtcclxuICAgICAgICBwdWJsaWMgcG9pbnRlclg6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgcG9pbnRlclk6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY2FudmFzWDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBjYW52YXNZOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGNsaWVudFJlY3Q6IENsaWVudFJlY3Q7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZywgX2V2ZW50OiBQb2ludGVyRXZlbnTGkikge1xyXG4gICAgICAgICAgICBzdXBlcih0eXBlLCBfZXZlbnQpO1xyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0OiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5fZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgICAgICB0aGlzLmNsaWVudFJlY3QgPSB0YXJnZXQuZ2V0Q2xpZW50UmVjdHMoKVswXTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyWCA9IF9ldmVudC5jbGllbnRYIC0gdGhpcy5jbGllbnRSZWN0LmxlZnQ7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlclkgPSBfZXZlbnQuY2xpZW50WSAtIHRoaXMuY2xpZW50UmVjdC50b3A7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEcmFnRHJvcEV2ZW50xpIgZXh0ZW5kcyBEcmFnRXZlbnQge1xyXG4gICAgICAgIHB1YmxpYyBwb2ludGVyWDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBwb2ludGVyWTogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBjYW52YXNYOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGNhbnZhc1k6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY2xpZW50UmVjdDogQ2xpZW50UmVjdDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IodHlwZTogc3RyaW5nLCBfZXZlbnQ6IERyYWdEcm9wRXZlbnTGkikge1xyXG4gICAgICAgICAgICBzdXBlcih0eXBlLCBfZXZlbnQpO1xyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0OiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5fZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgICAgICB0aGlzLmNsaWVudFJlY3QgPSB0YXJnZXQuZ2V0Q2xpZW50UmVjdHMoKVswXTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyWCA9IF9ldmVudC5jbGllbnRYIC0gdGhpcy5jbGllbnRSZWN0LmxlZnQ7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlclkgPSBfZXZlbnQuY2xpZW50WSAtIHRoaXMuY2xpZW50UmVjdC50b3A7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBXaGVlbEV2ZW50xpIgZXh0ZW5kcyBXaGVlbEV2ZW50IHtcclxuICAgICAgICBjb25zdHJ1Y3Rvcih0eXBlOiBzdHJpbmcsIF9ldmVudDogV2hlZWxFdmVudMaSKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKHR5cGUsIF9ldmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCB0eXBlIEV2ZW50xpIgPSBQb2ludGVyRXZlbnTGkiB8IERyYWdEcm9wRXZlbnTGkiB8IFdoZWVsRXZlbnTGkiB8IEtleWJvYXJkRXZlbnTGkiB8IEV2ZW50O1xyXG5cclxuICAgIGV4cG9ydCB0eXBlIEV2ZW50TGlzdGVuZXLGkiA9XHJcbiAgICAgICAgKChfZXZlbnQ6IFBvaW50ZXJFdmVudMaSKSA9PiB2b2lkKSB8XHJcbiAgICAgICAgKChfZXZlbnQ6IERyYWdEcm9wRXZlbnTGkikgPT4gdm9pZCkgfFxyXG4gICAgICAgICgoX2V2ZW50OiBXaGVlbEV2ZW50xpIpID0+IHZvaWQpIHxcclxuICAgICAgICAoKF9ldmVudDogS2V5Ym9hcmRFdmVudMaSKSA9PiB2b2lkKSB8XHJcbiAgICAgICAgKChfZXZlbnQ6IEV2ZW50xpIpID0+IHZvaWQpIHxcclxuICAgICAgICBFdmVudExpc3RlbmVyT2JqZWN0O1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFdmVudFRhcmdldMaSIGV4dGVuZHMgRXZlbnRUYXJnZXQge1xyXG4gICAgICAgIGFkZEV2ZW50TGlzdGVuZXIoX3R5cGU6IHN0cmluZywgX2hhbmRsZXI6IEV2ZW50TGlzdGVuZXLGkiwgX29wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWRkRXZlbnRMaXN0ZW5lcihfdHlwZSwgPEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3Q+X2hhbmRsZXIsIF9vcHRpb25zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcihfdHlwZTogc3RyaW5nLCBfaGFuZGxlcjogRXZlbnRMaXN0ZW5lcsaSLCBfb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5yZW1vdmVFdmVudExpc3RlbmVyKF90eXBlLCA8RXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdD5faGFuZGxlciwgX29wdGlvbnMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGlzcGF0Y2hFdmVudChfZXZlbnQ6IEV2ZW50xpIpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN1cGVyLmRpc3BhdGNoRXZlbnQoX2V2ZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCYXNlIGNsYXNzIGZvciBFdmVudFRhcmdldCBzaW5nbGV0b25zLCB3aGljaCBhcmUgZml4ZWQgZW50aXRpZXMgaW4gdGhlIHN0cnVjdHVyZSBvZiBGdWRnZSwgc3VjaCBhcyB0aGUgY29yZSBsb29wIFxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgRXZlbnRUYXJnZXRTdGF0aWMgZXh0ZW5kcyBFdmVudFRhcmdldMaSIHtcclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIHRhcmdldFN0YXRpYzogRXZlbnRUYXJnZXRTdGF0aWMgPSBuZXcgRXZlbnRUYXJnZXRTdGF0aWMoKTtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBhZGRFdmVudExpc3RlbmVyKF90eXBlOiBzdHJpbmcsIF9oYW5kbGVyOiBFdmVudExpc3RlbmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIEV2ZW50VGFyZ2V0U3RhdGljLnRhcmdldFN0YXRpYy5hZGRFdmVudExpc3RlbmVyKF90eXBlLCBfaGFuZGxlcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgcmVtb3ZlRXZlbnRMaXN0ZW5lcihfdHlwZTogc3RyaW5nLCBfaGFuZGxlcjogRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xyXG4gICAgICAgICAgICBFdmVudFRhcmdldFN0YXRpYy50YXJnZXRTdGF0aWMucmVtb3ZlRXZlbnRMaXN0ZW5lcihfdHlwZSwgX2hhbmRsZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGRpc3BhdGNoRXZlbnQoX2V2ZW50OiBFdmVudCk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBFdmVudFRhcmdldFN0YXRpYy50YXJnZXRTdGF0aWMuZGlzcGF0Y2hFdmVudChfZXZlbnQpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vRXZlbnQvRXZlbnQudHNcIi8+XHJcbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBJbnRlcmZhY2UgZGVzY3JpYmluZyB0aGUgZGF0YXR5cGVzIG9mIHRoZSBhdHRyaWJ1dGVzIGEgbXV0YXRvciBhcyBzdHJpbmdzIFxyXG4gICAgICovXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIE11dGF0b3JBdHRyaWJ1dGVUeXBlcyB7XHJcbiAgICAgICAgW2F0dHJpYnV0ZTogc3RyaW5nXTogc3RyaW5nIHwgT2JqZWN0O1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBJbnRlcmZhY2UgZGVzY3JpYmluZyBhIG11dGF0b3IsIHdoaWNoIGlzIGFuIGFzc29jaWF0aXZlIGFycmF5IHdpdGggbmFtZXMgb2YgYXR0cmlidXRlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyB2YWx1ZXNcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBNdXRhdG9yIHtcclxuICAgICAgICBbYXR0cmlidXRlOiBzdHJpbmddOiBPYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgICAqIEludGVyZmFjZXMgZGVkaWNhdGVkIGZvciBlYWNoIHB1cnBvc2UuIEV4dHJhIGF0dHJpYnV0ZSBuZWNlc3NhcnkgZm9yIGNvbXBpbGV0aW1lIHR5cGUgY2hlY2tpbmcsIG5vdCBleGlzdGVudCBhdCBydW50aW1lXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgTXV0YXRvckZvckFuaW1hdGlvbiBleHRlbmRzIE11dGF0b3IgeyByZWFkb25seSBmb3JBbmltYXRpb246IG51bGw7IH1cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgTXV0YXRvckZvclVzZXJJbnRlcmZhY2UgZXh0ZW5kcyBNdXRhdG9yIHsgcmVhZG9ubHkgZm9yVXNlckludGVyZmFjZTogbnVsbDsgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmFzZSBjbGFzcyBmb3IgYWxsIHR5cGVzIGJlaW5nIG11dGFibGUgdXNpbmcgW1tNdXRhdG9yXV0tb2JqZWN0cywgdGh1cyBwcm92aWRpbmcgYW5kIHVzaW5nIGludGVyZmFjZXMgY3JlYXRlZCBhdCBydW50aW1lLiAgXHJcbiAgICAgKiBNdXRhYmxlcyBwcm92aWRlIGEgW1tNdXRhdG9yXV0gdGhhdCBpcyBidWlsZCBieSBjb2xsZWN0aW5nIGFsbCBvYmplY3QtcHJvcGVydGllcyB0aGF0IGFyZSBlaXRoZXIgb2YgYSBwcmltaXRpdmUgdHlwZSBvciBhZ2FpbiBNdXRhYmxlLlxyXG4gICAgICogU3ViY2xhc3NlcyBjYW4gZWl0aGVyIHJlZHVjZSB0aGUgc3RhbmRhcmQgW1tNdXRhdG9yXV0gYnVpbHQgYnkgdGhpcyBiYXNlIGNsYXNzIGJ5IGRlbGV0aW5nIHByb3BlcnRpZXMgb3IgaW1wbGVtZW50IGFuIGluZGl2aWR1YWwgZ2V0TXV0YXRvci1tZXRob2QuXHJcbiAgICAgKiBUaGUgcHJvdmlkZWQgcHJvcGVydGllcyBvZiB0aGUgW1tNdXRhdG9yXV0gbXVzdCBtYXRjaCBwdWJsaWMgcHJvcGVydGllcyBvciBnZXR0ZXJzL3NldHRlcnMgb2YgdGhlIG9iamVjdC5cclxuICAgICAqIE90aGVyd2lzZSwgdGhleSB3aWxsIGJlIGlnbm9yZWQgaWYgbm90IGhhbmRsZWQgYnkgYW4gb3ZlcnJpZGUgb2YgdGhlIG11dGF0ZS1tZXRob2QgaW4gdGhlIHN1YmNsYXNzIGFuZCB0aHJvdyBlcnJvcnMgaW4gYW4gYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgdXNlci1pbnRlcmZhY2UgZm9yIHRoZSBvYmplY3QuXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBNdXRhYmxlIGV4dGVuZHMgRXZlbnRUYXJnZXTGkiB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmVzIHRoZSB0eXBlIG9mIHRoaXMgbXV0YWJsZSBzdWJjbGFzcyBhcyB0aGUgbmFtZSBvZiB0aGUgcnVudGltZSBjbGFzc1xyXG4gICAgICAgICAqIEByZXR1cm5zIFRoZSB0eXBlIG9mIHRoZSBtdXRhYmxlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldCB0eXBlKCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbGxlY3QgYXBwbGljYWJsZSBhdHRyaWJ1dGVzIG9mIHRoZSBpbnN0YW5jZSBhbmQgY29waWVzIG9mIHRoZWlyIHZhbHVlcyBpbiBhIE11dGF0b3Itb2JqZWN0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldE11dGF0b3IoKTogTXV0YXRvciB7XHJcbiAgICAgICAgICAgIGxldCBtdXRhdG9yOiBNdXRhdG9yID0ge307XHJcblxyXG4gICAgICAgICAgICAvLyBjb2xsZWN0IHByaW1pdGl2ZSBhbmQgbXV0YWJsZSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgIGZvciAobGV0IGF0dHJpYnV0ZSBpbiB0aGlzKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWU6IE9iamVjdCA9IHRoaXNbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0ICYmICEodmFsdWUgaW5zdGFuY2VvZiBNdXRhYmxlKSlcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIG11dGF0b3JbYXR0cmlidXRlXSA9IHRoaXNbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gbXV0YXRvciBjYW4gYmUgcmVkdWNlZCBidXQgbm90IGV4dGVuZGVkIVxyXG4gICAgICAgICAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobXV0YXRvcik7XHJcbiAgICAgICAgICAgIC8vIGRlbGV0ZSB1bndhbnRlZCBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgIHRoaXMucmVkdWNlTXV0YXRvcihtdXRhdG9yKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHJlcGxhY2UgcmVmZXJlbmNlcyB0byBtdXRhYmxlIG9iamVjdHMgd2l0aCByZWZlcmVuY2VzIHRvIGNvcGllc1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gbXV0YXRvcikge1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlOiBPYmplY3QgPSBtdXRhdG9yW2F0dHJpYnV0ZV07XHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBNdXRhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgIG11dGF0b3JbYXR0cmlidXRlXSA9IHZhbHVlLmdldE11dGF0b3IoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG11dGF0b3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb2xsZWN0IHRoZSBhdHRyaWJ1dGVzIG9mIHRoZSBpbnN0YW5jZSBhbmQgdGhlaXIgdmFsdWVzIGFwcGxpY2FibGUgZm9yIGFuaW1hdGlvbi5cclxuICAgICAgICAgKiBCYXNpYyBmdW5jdGlvbmFsaXR5IGlzIGlkZW50aWNhbCB0byBbW2dldE11dGF0b3JdXSwgcmV0dXJuZWQgbXV0YXRvciBzaG91bGQgdGhlbiBiZSByZWR1Y2VkIGJ5IHRoZSBzdWJjbGFzc2VkIGluc3RhbmNlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldE11dGF0b3JGb3JBbmltYXRpb24oKTogTXV0YXRvckZvckFuaW1hdGlvbiB7XHJcbiAgICAgICAgICAgIHJldHVybiA8TXV0YXRvckZvckFuaW1hdGlvbj50aGlzLmdldE11dGF0b3IoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29sbGVjdCB0aGUgYXR0cmlidXRlcyBvZiB0aGUgaW5zdGFuY2UgYW5kIHRoZWlyIHZhbHVlcyBhcHBsaWNhYmxlIGZvciB0aGUgdXNlciBpbnRlcmZhY2UuXHJcbiAgICAgICAgICogQmFzaWMgZnVuY3Rpb25hbGl0eSBpcyBpZGVudGljYWwgdG8gW1tnZXRNdXRhdG9yXV0sIHJldHVybmVkIG11dGF0b3Igc2hvdWxkIHRoZW4gYmUgcmVkdWNlZCBieSB0aGUgc3ViY2xhc3NlZCBpbnN0YW5jZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBnZXRNdXRhdG9yRm9yVXNlckludGVyZmFjZSgpOiBNdXRhdG9yRm9yVXNlckludGVyZmFjZSB7XHJcbiAgICAgICAgICAgIHJldHVybiA8TXV0YXRvckZvclVzZXJJbnRlcmZhY2U+dGhpcy5nZXRNdXRhdG9yKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgYW4gYXNzb2NpYXRpdmUgYXJyYXkgd2l0aCB0aGUgc2FtZSBhdHRyaWJ1dGVzIGFzIHRoZSBnaXZlbiBtdXRhdG9yLCBidXQgd2l0aCB0aGUgY29ycmVzcG9uZGluZyB0eXBlcyBhcyBzdHJpbmctdmFsdWVzXHJcbiAgICAgICAgICogRG9lcyBub3QgcmVjdXJzZSBpbnRvIG9iamVjdHMhXHJcbiAgICAgICAgICogQHBhcmFtIF9tdXRhdG9yIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBnZXRNdXRhdG9yQXR0cmlidXRlVHlwZXMoX211dGF0b3I6IE11dGF0b3IpOiBNdXRhdG9yQXR0cmlidXRlVHlwZXMge1xyXG4gICAgICAgICAgICBsZXQgdHlwZXM6IE11dGF0b3JBdHRyaWJ1dGVUeXBlcyA9IHt9O1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gX211dGF0b3IpIHtcclxuICAgICAgICAgICAgICAgIGxldCB0eXBlOiBzdHJpbmcgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlOiBudW1iZXIgfCBib29sZWFuIHwgc3RyaW5nIHwgb2JqZWN0ID0gX211dGF0b3JbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgICAgIGlmIChfbXV0YXRvclthdHRyaWJ1dGVdICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mICh2YWx1ZSkgPT0gXCJvYmplY3RcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICg8R2VuZXJhbD50aGlzKVthdHRyaWJ1dGVdLmNvbnN0cnVjdG9yLm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gX211dGF0b3JbYXR0cmlidXRlXS5jb25zdHJ1Y3Rvci5uYW1lO1xyXG4gICAgICAgICAgICAgICAgdHlwZXNbYXR0cmlidXRlXSA9IHR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBVcGRhdGVzIHRoZSB2YWx1ZXMgb2YgdGhlIGdpdmVuIG11dGF0b3IgYWNjb3JkaW5nIHRvIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBpbnN0YW5jZVxyXG4gICAgICAgICAqIEBwYXJhbSBfbXV0YXRvciBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgdXBkYXRlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gX211dGF0b3IpIHtcclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTogT2JqZWN0ID0gX211dGF0b3JbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE11dGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5nZXRNdXRhdG9yKCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgX211dGF0b3JbYXR0cmlidXRlXSA9ICg8R2VuZXJhbD50aGlzKVthdHRyaWJ1dGVdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFVwZGF0ZXMgdGhlIGF0dHJpYnV0ZSB2YWx1ZXMgb2YgdGhlIGluc3RhbmNlIGFjY29yZGluZyB0byB0aGUgc3RhdGUgb2YgdGhlIG11dGF0b3IuIE11c3QgYmUgcHJvdGVjdGVkLi4uIVxyXG4gICAgICAgICAqIEBwYXJhbSBfbXV0YXRvclxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBtdXRhdGUoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogZG9uJ3QgYXNzaWduIHVua25vd24gcHJvcGVydGllc1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gX211dGF0b3IpIHtcclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTogTXV0YXRvciA9IDxNdXRhdG9yPl9tdXRhdG9yW2F0dHJpYnV0ZV07XHJcbiAgICAgICAgICAgICAgICBsZXQgbXV0YW50OiBPYmplY3QgPSAoPEdlbmVyYWw+dGhpcylbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgICAgIGlmIChtdXRhbnQgaW5zdGFuY2VvZiBNdXRhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgIG11dGFudC5tdXRhdGUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICg8R2VuZXJhbD50aGlzKVthdHRyaWJ1dGVdID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChFVkVOVC5NVVRBVEUpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVkdWNlcyB0aGUgYXR0cmlidXRlcyBvZiB0aGUgZ2VuZXJhbCBtdXRhdG9yIGFjY29yZGluZyB0byBkZXNpcmVkIG9wdGlvbnMgZm9yIG11dGF0aW9uLiBUbyBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc2VzXHJcbiAgICAgICAgICogQHBhcmFtIF9tdXRhdG9yIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByb3RlY3RlZCBhYnN0cmFjdCByZWR1Y2VNdXRhdG9yKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZDtcclxuICAgIH1cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvU2VyaWFsaXplci50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL011dGFibGUudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAvKipcclxuICAgKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgQW5pbWF0aW9uU3RydWN0dXJlIHRoYXQgdGhlIEFuaW1hdGlvbiB1c2VzIHRvIG1hcCB0aGUgU2VxdWVuY2VzIHRvIHRoZSBBdHRyaWJ1dGVzLlxyXG4gICAqIEJ1aWx0IG91dCBvZiBhIFtbTm9kZV1dJ3Mgc2VyaWFsc2F0aW9uLCBpdCBzd2FwcyB0aGUgdmFsdWVzIHdpdGggW1tBbmltYXRpb25TZXF1ZW5jZV1dcy5cclxuICAgKi9cclxuICBleHBvcnQgaW50ZXJmYWNlIEFuaW1hdGlvblN0cnVjdHVyZSB7XHJcbiAgICBbYXR0cmlidXRlOiBzdHJpbmddOiBTZXJpYWxpemF0aW9uIHwgQW5pbWF0aW9uU2VxdWVuY2U7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAqIEFuIGFzc29jaWF0aXZlIGFycmF5IG1hcHBpbmcgbmFtZXMgb2YgbGFibGVzIHRvIHRpbWVzdGFtcHMuXHJcbiAgKiBMYWJlbHMgbmVlZCB0byBiZSB1bmlxdWUgcGVyIEFuaW1hdGlvbi5cclxuICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcclxuICAqL1xyXG4gIGV4cG9ydCBpbnRlcmZhY2UgQW5pbWF0aW9uTGFiZWwge1xyXG4gICAgW25hbWU6IHN0cmluZ106IG51bWJlcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICogSG9sZHMgaW5mb3JtYXRpb24gYWJvdXQgQW5pbWF0aW9uIEV2ZW50IFRyaWdnZXJzXHJcbiAgKiBAYXV0aG9yIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XHJcbiAgKi9cclxuICBleHBvcnQgaW50ZXJmYWNlIEFuaW1hdGlvbkV2ZW50VHJpZ2dlciB7XHJcbiAgICBbbmFtZTogc3RyaW5nXTogbnVtYmVyO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW50ZXJuYWxseSB1c2VkIHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiB0aGUgdmFyaW91cyBnZW5lcmF0ZWQgc3RydWN0dXJlcyBhbmQgZXZlbnRzLlxyXG4gICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcclxuICAgKi9cclxuICBlbnVtIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSB7XHJcbiAgICAvKipEZWZhdWx0OiBmb3J3YXJkLCBjb250aW5vdXMgKi9cclxuICAgIE5PUk1BTCxcclxuICAgIC8qKmJhY2t3YXJkLCBjb250aW5vdXMgKi9cclxuICAgIFJFVkVSU0UsXHJcbiAgICAvKipmb3J3YXJkLCByYXN0ZXJlZCAqL1xyXG4gICAgUkFTVEVSRUQsXHJcbiAgICAvKipiYWNrd2FyZCwgcmFzdGVyZWQgKi9cclxuICAgIFJBU1RFUkVEUkVWRVJTRVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQW5pbWF0aW9uIENsYXNzIHRvIGhvbGQgYWxsIHJlcXVpcmVkIE9iamVjdHMgdGhhdCBhcmUgcGFydCBvZiBhbiBBbmltYXRpb24uXHJcbiAgICogQWxzbyBob2xkcyBmdW5jdGlvbnMgdG8gcGxheSBzYWlkIEFuaW1hdGlvbi5cclxuICAgKiBDYW4gYmUgYWRkZWQgdG8gYSBOb2RlIGFuZCBwbGF5ZWQgdGhyb3VnaCBbW0NvbXBvbmVudEFuaW1hdG9yXV0uXHJcbiAgICogQGF1dGhvciBMdWthcyBTY2hldWVybGUsIEhGVSwgMjAxOVxyXG4gICAqL1xyXG4gIGV4cG9ydCBjbGFzcyBBbmltYXRpb24gZXh0ZW5kcyBNdXRhYmxlIGltcGxlbWVudHMgU2VyaWFsaXphYmxlUmVzb3VyY2Uge1xyXG4gICAgaWRSZXNvdXJjZTogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgdG90YWxUaW1lOiBudW1iZXIgPSAwO1xyXG4gICAgbGFiZWxzOiBBbmltYXRpb25MYWJlbCA9IHt9O1xyXG4gICAgc3RlcHNQZXJTZWNvbmQ6IG51bWJlciA9IDEwO1xyXG4gICAgYW5pbWF0aW9uU3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmU7XHJcbiAgICBldmVudHM6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHt9O1xyXG4gICAgcHJpdmF0ZSBmcmFtZXNQZXJTZWNvbmQ6IG51bWJlciA9IDYwO1xyXG5cclxuICAgIC8vIHByb2Nlc3NlZCBldmVudGxpc3QgYW5kIGFuaW1hdGlvbiBzdHJ1Y3V0cmVzIGZvciBwbGF5YmFjay5cclxuICAgIHByaXZhdGUgZXZlbnRzUHJvY2Vzc2VkOiBNYXA8QU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLCBBbmltYXRpb25FdmVudFRyaWdnZXI+ID0gbmV3IE1hcDxBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUsIEFuaW1hdGlvbkV2ZW50VHJpZ2dlcj4oKTtcclxuICAgIHByaXZhdGUgYW5pbWF0aW9uU3RydWN0dXJlc1Byb2Nlc3NlZDogTWFwPEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSwgQW5pbWF0aW9uU3RydWN0dXJlPiA9IG5ldyBNYXA8QU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLCBBbmltYXRpb25TdHJ1Y3R1cmU+KCk7XHJcblxyXG4gICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2FuaW1TdHJ1Y3R1cmU6IEFuaW1hdGlvblN0cnVjdHVyZSA9IHt9LCBfZnBzOiBudW1iZXIgPSA2MCkge1xyXG4gICAgICBzdXBlcigpO1xyXG4gICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcclxuICAgICAgdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmUgPSBfYW5pbVN0cnVjdHVyZTtcclxuICAgICAgdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmVzUHJvY2Vzc2VkLnNldChBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuTk9STUFMLCBfYW5pbVN0cnVjdHVyZSk7XHJcbiAgICAgIHRoaXMuZnJhbWVzUGVyU2Vjb25kID0gX2ZwcztcclxuICAgICAgdGhpcy5jYWxjdWxhdGVUb3RhbFRpbWUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdlbmVyYXRlcyBhIG5ldyBcIk11dGF0b3JcIiB3aXRoIHRoZSBpbmZvcm1hdGlvbiB0byBhcHBseSB0byB0aGUgW1tOb2RlXV0gdGhlIFtbQ29tcG9uZW50QW5pbWF0b3JdXSBpcyBhdHRhY2hlZCB0byB3aXRoIFtbTm9kZS5hcHBseUFuaW1hdGlvbigpXV0uXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgVGhlIHRpbWUgYXQgd2hpY2ggdGhlIGFuaW1hdGlvbiBjdXJyZW50bHkgaXMgYXRcclxuICAgICAqIEBwYXJhbSBfZGlyZWN0aW9uIFRoZSBkaXJlY3Rpb24gaW4gd2hpY2ggdGhlIGFuaW1hdGlvbiBpcyBzdXBwb3NlZCB0byBiZSBwbGF5aW5nIGJhY2suID4wID09IGZvcndhcmQsIDAgPT0gc3RvcCwgPDAgPT0gYmFja3dhcmRzXHJcbiAgICAgKiBAcGFyYW0gX3BsYXliYWNrIFRoZSBwbGF5YmFja21vZGUgdGhlIGFuaW1hdGlvbiBpcyBzdXBwb3NlZCB0byBiZSBjYWxjdWxhdGVkIHdpdGguXHJcbiAgICAgKiBAcmV0dXJucyBhIFwiTXV0YXRvclwiIHRvIGFwcGx5LlxyXG4gICAgICovXHJcbiAgICBnZXRNdXRhdGVkKF90aW1lOiBudW1iZXIsIF9kaXJlY3Rpb246IG51bWJlciwgX3BsYXliYWNrOiBBTklNQVRJT05fUExBWUJBQ0spOiBNdXRhdG9yIHsgICAgIC8vVE9ETzogZmluZCBhIGJldHRlciBuYW1lIGZvciB0aGlzXHJcbiAgICAgIGxldCBtOiBNdXRhdG9yID0ge307XHJcbiAgICAgIGlmIChfcGxheWJhY2sgPT0gQU5JTUFUSU9OX1BMQVlCQUNLLlRJTUVCQVNFRF9DT05USU5PVVMpIHtcclxuICAgICAgICBpZiAoX2RpcmVjdGlvbiA+PSAwKSB7XHJcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLk5PUk1BTCksIF90aW1lKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbSA9IHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JNdXRhdG9yKHRoaXMuZ2V0UHJvY2Vzc2VkQW5pbWF0aW9uU3RydWN0dXJlKEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SRVZFUlNFKSwgX3RpbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoX2RpcmVjdGlvbiA+PSAwKSB7XHJcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEKSwgX3RpbWUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEUkVWRVJTRSksIF90aW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBtO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJucyBhIGxpc3Qgb2YgdGhlIG5hbWVzIG9mIHRoZSBldmVudHMgdGhlIFtbQ29tcG9uZW50QW5pbWF0b3JdXSBuZWVkcyB0byBmaXJlIGJldHdlZW4gX21pbiBhbmQgX21heC4gXHJcbiAgICAgKiBAcGFyYW0gX21pbiBUaGUgbWluaW11bSB0aW1lIChpbmNsdXNpdmUpIHRvIGNoZWNrIGJldHdlZW5cclxuICAgICAqIEBwYXJhbSBfbWF4IFRoZSBtYXhpbXVtIHRpbWUgKGV4Y2x1c2l2ZSkgdG8gY2hlY2sgYmV0d2VlblxyXG4gICAgICogQHBhcmFtIF9wbGF5YmFjayBUaGUgcGxheWJhY2sgbW9kZSB0byBjaGVjayBpbi4gSGFzIGFuIGVmZmVjdCBvbiB3aGVuIHRoZSBFdmVudHMgYXJlIGZpcmVkLiBcclxuICAgICAqIEBwYXJhbSBfZGlyZWN0aW9uIFRoZSBkaXJlY3Rpb24gdGhlIGFuaW1hdGlvbiBpcyBzdXBwb3NlZCB0byBydW4gaW4uID4wID09IGZvcndhcmQsIDAgPT0gc3RvcCwgPDAgPT0gYmFja3dhcmRzXHJcbiAgICAgKiBAcmV0dXJucyBhIGxpc3Qgb2Ygc3RyaW5ncyB3aXRoIHRoZSBuYW1lcyBvZiB0aGUgY3VzdG9tIGV2ZW50cyB0byBmaXJlLlxyXG4gICAgICovXHJcbiAgICBnZXRFdmVudHNUb0ZpcmUoX21pbjogbnVtYmVyLCBfbWF4OiBudW1iZXIsIF9wbGF5YmFjazogQU5JTUFUSU9OX1BMQVlCQUNLLCBfZGlyZWN0aW9uOiBudW1iZXIpOiBzdHJpbmdbXSB7XHJcbiAgICAgIGxldCBldmVudExpc3Q6IHN0cmluZ1tdID0gW107XHJcbiAgICAgIGxldCBtaW5TZWN0aW9uOiBudW1iZXIgPSBNYXRoLmZsb29yKF9taW4gLyB0aGlzLnRvdGFsVGltZSk7XHJcbiAgICAgIGxldCBtYXhTZWN0aW9uOiBudW1iZXIgPSBNYXRoLmZsb29yKF9tYXggLyB0aGlzLnRvdGFsVGltZSk7XHJcbiAgICAgIF9taW4gPSBfbWluICUgdGhpcy50b3RhbFRpbWU7XHJcbiAgICAgIF9tYXggPSBfbWF4ICUgdGhpcy50b3RhbFRpbWU7XHJcblxyXG4gICAgICB3aGlsZSAobWluU2VjdGlvbiA8PSBtYXhTZWN0aW9uKSB7XHJcbiAgICAgICAgbGV0IGV2ZW50VHJpZ2dlcnM6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHRoaXMuZ2V0Q29ycmVjdEV2ZW50TGlzdChfZGlyZWN0aW9uLCBfcGxheWJhY2spO1xyXG4gICAgICAgIGlmIChtaW5TZWN0aW9uID09IG1heFNlY3Rpb24pIHtcclxuICAgICAgICAgIGV2ZW50TGlzdCA9IGV2ZW50TGlzdC5jb25jYXQodGhpcy5jaGVja0V2ZW50c0JldHdlZW4oZXZlbnRUcmlnZ2VycywgX21pbiwgX21heCkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBldmVudExpc3QgPSBldmVudExpc3QuY29uY2F0KHRoaXMuY2hlY2tFdmVudHNCZXR3ZWVuKGV2ZW50VHJpZ2dlcnMsIF9taW4sIHRoaXMudG90YWxUaW1lKSk7XHJcbiAgICAgICAgICBfbWluID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgbWluU2VjdGlvbisrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gZXZlbnRMaXN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRkcyBhbiBFdmVudCB0byB0aGUgTGlzdCBvZiBldmVudHMuXHJcbiAgICAgKiBAcGFyYW0gX25hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50IChuZWVkcyB0byBiZSB1bmlxdWUgcGVyIEFuaW1hdGlvbikuXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgVGhlIHRpbWVzdGFtcCBvZiB0aGUgZXZlbnQgKGluIG1pbGxpc2Vjb25kcykuXHJcbiAgICAgKi9cclxuICAgIHNldEV2ZW50KF9uYW1lOiBzdHJpbmcsIF90aW1lOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgdGhpcy5ldmVudHNbX25hbWVdID0gX3RpbWU7XHJcbiAgICAgIHRoaXMuZXZlbnRzUHJvY2Vzc2VkLmNsZWFyKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyB0aGUgZXZlbnQgd2l0aCB0aGUgZ2l2ZW4gbmFtZSBmcm9tIHRoZSBsaXN0IG9mIGV2ZW50cy5cclxuICAgICAqIEBwYXJhbSBfbmFtZSBuYW1lIG9mIHRoZSBldmVudCB0byByZW1vdmUuXHJcbiAgICAgKi9cclxuICAgIHJlbW92ZUV2ZW50KF9uYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgZGVsZXRlIHRoaXMuZXZlbnRzW19uYW1lXTtcclxuICAgICAgdGhpcy5ldmVudHNQcm9jZXNzZWQuY2xlYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgZ2V0TGFiZWxzKCk6IEVudW1lcmF0b3Ige1xyXG4gICAgICAvL1RPRE86IHRoaXMgYWN0dWFsbHkgbmVlZHMgdGVzdGluZ1xyXG4gICAgICBsZXQgZW46IEVudW1lcmF0b3IgPSBuZXcgRW51bWVyYXRvcih0aGlzLmxhYmVscyk7XHJcbiAgICAgIHJldHVybiBlbjtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgZnBzKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLmZyYW1lc1BlclNlY29uZDtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgZnBzKF9mcHM6IG51bWJlcikge1xyXG4gICAgICB0aGlzLmZyYW1lc1BlclNlY29uZCA9IF9mcHM7XHJcbiAgICAgIHRoaXMuZXZlbnRzUHJvY2Vzc2VkLmNsZWFyKCk7XHJcbiAgICAgIHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlc1Byb2Nlc3NlZC5jbGVhcigpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogKFJlLSlDYWxjdWxhdGUgdGhlIHRvdGFsIHRpbWUgb2YgdGhlIEFuaW1hdGlvbi4gQ2FsY3VsYXRpb24taGVhdnksIHVzZSBvbmx5IGlmIGFjdHVhbGx5IG5lZWRlZC5cclxuICAgICAqL1xyXG4gICAgY2FsY3VsYXRlVG90YWxUaW1lKCk6IHZvaWQge1xyXG4gICAgICB0aGlzLnRvdGFsVGltZSA9IDA7XHJcbiAgICAgIHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JUaW1lKHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gdHJhbnNmZXJcclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IHM6IFNlcmlhbGl6YXRpb24gPSB7XHJcbiAgICAgICAgaWRSZXNvdXJjZTogdGhpcy5pZFJlc291cmNlLFxyXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcclxuICAgICAgICBsYWJlbHM6IHt9LFxyXG4gICAgICAgIGV2ZW50czoge30sXHJcbiAgICAgICAgZnBzOiB0aGlzLmZyYW1lc1BlclNlY29uZCxcclxuICAgICAgICBzcHM6IHRoaXMuc3RlcHNQZXJTZWNvbmRcclxuICAgICAgfTtcclxuICAgICAgZm9yIChsZXQgbmFtZSBpbiB0aGlzLmxhYmVscykge1xyXG4gICAgICAgIHMubGFiZWxzW25hbWVdID0gdGhpcy5sYWJlbHNbbmFtZV07XHJcbiAgICAgIH1cclxuICAgICAgZm9yIChsZXQgbmFtZSBpbiB0aGlzLmV2ZW50cykge1xyXG4gICAgICAgIHMuZXZlbnRzW25hbWVdID0gdGhpcy5ldmVudHNbbmFtZV07XHJcbiAgICAgIH1cclxuICAgICAgcy5hbmltYXRpb25TdHJ1Y3R1cmUgPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yU2VyaWFsaXNhdGlvbih0aGlzLmFuaW1hdGlvblN0cnVjdHVyZSk7XHJcbiAgICAgIHJldHVybiBzO1xyXG4gICAgfVxyXG4gICAgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICB0aGlzLmlkUmVzb3VyY2UgPSBfc2VyaWFsaXphdGlvbi5pZFJlc291cmNlO1xyXG4gICAgICB0aGlzLm5hbWUgPSBfc2VyaWFsaXphdGlvbi5uYW1lO1xyXG4gICAgICB0aGlzLmZyYW1lc1BlclNlY29uZCA9IF9zZXJpYWxpemF0aW9uLmZwcztcclxuICAgICAgdGhpcy5zdGVwc1BlclNlY29uZCA9IF9zZXJpYWxpemF0aW9uLnNwcztcclxuICAgICAgdGhpcy5sYWJlbHMgPSB7fTtcclxuICAgICAgZm9yIChsZXQgbmFtZSBpbiBfc2VyaWFsaXphdGlvbi5sYWJlbHMpIHtcclxuICAgICAgICB0aGlzLmxhYmVsc1tuYW1lXSA9IF9zZXJpYWxpemF0aW9uLmxhYmVsc1tuYW1lXTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmV2ZW50cyA9IHt9O1xyXG4gICAgICBmb3IgKGxldCBuYW1lIGluIF9zZXJpYWxpemF0aW9uLmV2ZW50cykge1xyXG4gICAgICAgIHRoaXMuZXZlbnRzW25hbWVdID0gX3NlcmlhbGl6YXRpb24uZXZlbnRzW25hbWVdO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuZXZlbnRzUHJvY2Vzc2VkID0gbmV3IE1hcDxBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUsIEFuaW1hdGlvbkV2ZW50VHJpZ2dlcj4oKTtcclxuXHJcbiAgICAgIHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvckRlc2VyaWFsaXNhdGlvbihfc2VyaWFsaXphdGlvbi5hbmltYXRpb25TdHJ1Y3R1cmUpO1xyXG5cclxuICAgICAgdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmVzUHJvY2Vzc2VkID0gbmV3IE1hcDxBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUsIEFuaW1hdGlvblN0cnVjdHVyZT4oKTtcclxuXHJcbiAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgcHVibGljIGdldE11dGF0b3IoKTogTXV0YXRvciB7XHJcbiAgICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZSgpO1xyXG4gICAgfVxyXG4gICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgZGVsZXRlIF9tdXRhdG9yLnRvdGFsVGltZTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogVHJhdmVyc2VzIGFuIEFuaW1hdGlvblN0cnVjdHVyZSBhbmQgcmV0dXJucyB0aGUgU2VyaWFsaXphdGlvbiBvZiBzYWlkIFN0cnVjdHVyZS5cclxuICAgICAqIEBwYXJhbSBfc3RydWN0dXJlIFRoZSBBbmltYXRpb24gU3RydWN0dXJlIGF0IHRoZSBjdXJyZW50IGxldmVsIHRvIHRyYW5zZm9ybSBpbnRvIHRoZSBTZXJpYWxpemF0aW9uLlxyXG4gICAgICogQHJldHVybnMgdGhlIGZpbGxlZCBTZXJpYWxpemF0aW9uLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyYXZlcnNlU3RydWN0dXJlRm9yU2VyaWFsaXNhdGlvbihfc3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IG5ld1NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB7fTtcclxuICAgICAgZm9yIChsZXQgbiBpbiBfc3RydWN0dXJlKSB7XHJcbiAgICAgICAgaWYgKF9zdHJ1Y3R1cmVbbl0gaW5zdGFuY2VvZiBBbmltYXRpb25TZXF1ZW5jZSkge1xyXG4gICAgICAgICAgbmV3U2VyaWFsaXphdGlvbltuXSA9IF9zdHJ1Y3R1cmVbbl0uc2VyaWFsaXplKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb25bbl0gPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yU2VyaWFsaXNhdGlvbig8QW5pbWF0aW9uU3RydWN0dXJlPl9zdHJ1Y3R1cmVbbl0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbmV3U2VyaWFsaXphdGlvbjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogVHJhdmVyc2VzIGEgU2VyaWFsaXphdGlvbiB0byBjcmVhdGUgYSBuZXcgQW5pbWF0aW9uU3RydWN0dXJlLlxyXG4gICAgICogQHBhcmFtIF9zZXJpYWxpemF0aW9uIFRoZSBzZXJpYWxpemF0aW9uIHRvIHRyYW5zZmVyIGludG8gYW4gQW5pbWF0aW9uU3RydWN0dXJlXHJcbiAgICAgKiBAcmV0dXJucyB0aGUgbmV3bHkgY3JlYXRlZCBBbmltYXRpb25TdHJ1Y3R1cmUuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdHJhdmVyc2VTdHJ1Y3R1cmVGb3JEZXNlcmlhbGlzYXRpb24oX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBBbmltYXRpb25TdHJ1Y3R1cmUge1xyXG4gICAgICBsZXQgbmV3U3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUgPSB7fTtcclxuICAgICAgZm9yIChsZXQgbiBpbiBfc2VyaWFsaXphdGlvbikge1xyXG4gICAgICAgIGlmIChfc2VyaWFsaXphdGlvbltuXS5hbmltYXRpb25TZXF1ZW5jZSkge1xyXG4gICAgICAgICAgbGV0IGFuaW1TZXE6IEFuaW1hdGlvblNlcXVlbmNlID0gbmV3IEFuaW1hdGlvblNlcXVlbmNlKCk7XHJcbiAgICAgICAgICBuZXdTdHJ1Y3R1cmVbbl0gPSBhbmltU2VxLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uW25dKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbmV3U3RydWN0dXJlW25dID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvckRlc2VyaWFsaXNhdGlvbihfc2VyaWFsaXphdGlvbltuXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBuZXdTdHJ1Y3R1cmU7XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpbmRzIHRoZSBsaXN0IG9mIGV2ZW50cyB0byBiZSB1c2VkIHdpdGggdGhlc2Ugc2V0dGluZ3MuXHJcbiAgICAgKiBAcGFyYW0gX2RpcmVjdGlvbiBUaGUgZGlyZWN0aW9uIHRoZSBhbmltYXRpb24gaXMgcGxheWluZyBpbi5cclxuICAgICAqIEBwYXJhbSBfcGxheWJhY2sgVGhlIHBsYXliYWNrbW9kZSB0aGUgYW5pbWF0aW9uIGlzIHBsYXlpbmcgaW4uXHJcbiAgICAgKiBAcmV0dXJucyBUaGUgY29ycmVjdCBBbmltYXRpb25FdmVudFRyaWdnZXIgT2JqZWN0IHRvIHVzZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldENvcnJlY3RFdmVudExpc3QoX2RpcmVjdGlvbjogbnVtYmVyLCBfcGxheWJhY2s6IEFOSU1BVElPTl9QTEFZQkFDSyk6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciB7XHJcbiAgICAgIGlmIChfcGxheWJhY2sgIT0gQU5JTUFUSU9OX1BMQVlCQUNLLkZSQU1FQkFTRUQpIHtcclxuICAgICAgICBpZiAoX2RpcmVjdGlvbiA+PSAwKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQcm9jZXNzZWRFdmVudFRyaWdnZXIoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLk5PUk1BTCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmdldFByb2Nlc3NlZEV2ZW50VHJpZ2dlcihBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChfZGlyZWN0aW9uID49IDApIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmdldFByb2Nlc3NlZEV2ZW50VHJpZ2dlcihBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRUQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQcm9jZXNzZWRFdmVudFRyaWdnZXIoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEUkVWRVJTRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUcmF2ZXJzZXMgYW4gQW5pbWF0aW9uU3RydWN0dXJlIHRvIHR1cm4gaXQgaW50byB0aGUgXCJNdXRhdG9yXCIgdG8gcmV0dXJuIHRvIHRoZSBDb21wb25lbnQuXHJcbiAgICAgKiBAcGFyYW0gX3N0cnVjdHVyZSBUaGUgc3RyY3V0dXJlIHRvIHRyYXZlcnNlXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgdGhlIHBvaW50IGluIHRpbWUgdG8gd3JpdGUgdGhlIGFuaW1hdGlvbiBudW1iZXJzIGludG8uXHJcbiAgICAgKiBAcmV0dXJucyBUaGUgXCJNdXRhdG9yXCIgZmlsbGVkIHdpdGggdGhlIGNvcnJlY3QgdmFsdWVzIGF0IHRoZSBnaXZlbiB0aW1lLiBcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB0cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IoX3N0cnVjdHVyZTogQW5pbWF0aW9uU3RydWN0dXJlLCBfdGltZTogbnVtYmVyKTogTXV0YXRvciB7XHJcbiAgICAgIGxldCBuZXdNdXRhdG9yOiBNdXRhdG9yID0ge307XHJcbiAgICAgIGZvciAobGV0IG4gaW4gX3N0cnVjdHVyZSkge1xyXG4gICAgICAgIGlmIChfc3RydWN0dXJlW25dIGluc3RhbmNlb2YgQW5pbWF0aW9uU2VxdWVuY2UpIHtcclxuICAgICAgICAgIG5ld011dGF0b3Jbbl0gPSAoPEFuaW1hdGlvblNlcXVlbmNlPl9zdHJ1Y3R1cmVbbl0pLmV2YWx1YXRlKF90aW1lKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbmV3TXV0YXRvcltuXSA9IHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JNdXRhdG9yKDxBbmltYXRpb25TdHJ1Y3R1cmU+X3N0cnVjdHVyZVtuXSwgX3RpbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbmV3TXV0YXRvcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyYXZlcnNlcyB0aGUgY3VycmVudCBBbmltYXRpb25TdHJjdXR1cmUgdG8gZmluZCB0aGUgdG90YWxUaW1lIG9mIHRoaXMgYW5pbWF0aW9uLlxyXG4gICAgICogQHBhcmFtIF9zdHJ1Y3R1cmUgVGhlIHN0cnVjdHVyZSB0byB0cmF2ZXJzZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyYXZlcnNlU3RydWN0dXJlRm9yVGltZShfc3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUpOiB2b2lkIHtcclxuICAgICAgZm9yIChsZXQgbiBpbiBfc3RydWN0dXJlKSB7XHJcbiAgICAgICAgaWYgKF9zdHJ1Y3R1cmVbbl0gaW5zdGFuY2VvZiBBbmltYXRpb25TZXF1ZW5jZSkge1xyXG4gICAgICAgICAgbGV0IHNlcXVlbmNlOiBBbmltYXRpb25TZXF1ZW5jZSA9IDxBbmltYXRpb25TZXF1ZW5jZT5fc3RydWN0dXJlW25dO1xyXG4gICAgICAgICAgaWYgKHNlcXVlbmNlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IHNlcXVlbmNlVGltZTogbnVtYmVyID0gc2VxdWVuY2UuZ2V0S2V5KHNlcXVlbmNlLmxlbmd0aCAtIDEpLlRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMudG90YWxUaW1lID0gc2VxdWVuY2VUaW1lID4gdGhpcy50b3RhbFRpbWUgPyBzZXF1ZW5jZVRpbWUgOiB0aGlzLnRvdGFsVGltZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvclRpbWUoPEFuaW1hdGlvblN0cnVjdHVyZT5fc3RydWN0dXJlW25dKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEVuc3VyZXMgdGhlIGV4aXN0YW5jZSBvZiB0aGUgcmVxdWVzdGVkIFtbQW5pbWF0aW9uU3RyY3V0dXJlXV0gYW5kIHJldHVybnMgaXQuXHJcbiAgICAgKiBAcGFyYW0gX3R5cGUgdGhlIHR5cGUgb2YgdGhlIHN0cnVjdHVyZSB0byBnZXRcclxuICAgICAqIEByZXR1cm5zIHRoZSByZXF1ZXN0ZWQgW1tBbmltYXRpb25TdHJ1Y3R1cmVdXVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldFByb2Nlc3NlZEFuaW1hdGlvblN0cnVjdHVyZShfdHlwZTogQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFKTogQW5pbWF0aW9uU3RydWN0dXJlIHtcclxuICAgICAgaWYgKCF0aGlzLmFuaW1hdGlvblN0cnVjdHVyZXNQcm9jZXNzZWQuaGFzKF90eXBlKSkge1xyXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XHJcbiAgICAgICAgbGV0IGFlOiBBbmltYXRpb25TdHJ1Y3R1cmUgPSB7fTtcclxuICAgICAgICBzd2l0Y2ggKF90eXBlKSB7XHJcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgIGFlID0gdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRTpcclxuICAgICAgICAgICAgYWUgPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlLCB0aGlzLmNhbGN1bGF0ZVJldmVyc2VTZXF1ZW5jZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SQVNURVJFRDpcclxuICAgICAgICAgICAgYWUgPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlLCB0aGlzLmNhbGN1bGF0ZVJhc3RlcmVkU2VxdWVuY2UuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRURSRVZFUlNFOlxyXG4gICAgICAgICAgICBhZSA9IHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JOZXdTdHJ1Y3R1cmUodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJFVkVSU0UpLCB0aGlzLmNhbGN1bGF0ZVJhc3RlcmVkU2VxdWVuY2UuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmFuaW1hdGlvblN0cnVjdHVyZXNQcm9jZXNzZWQuc2V0KF90eXBlLCBhZSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlc1Byb2Nlc3NlZC5nZXQoX3R5cGUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRW5zdXJlcyB0aGUgZXhpc3RhbmNlIG9mIHRoZSByZXF1ZXN0ZWQgW1tBbmltYXRpb25FdmVudFRyaWdnZXJdXSBhbmQgcmV0dXJucyBpdC5cclxuICAgICAqIEBwYXJhbSBfdHlwZSBUaGUgdHlwZSBvZiBBbmltYXRpb25FdmVudFRyaWdnZXIgdG8gZ2V0XHJcbiAgICAgKiBAcmV0dXJucyB0aGUgcmVxdWVzdGVkIFtbQW5pbWF0aW9uRXZlbnRUcmlnZ2VyXV1cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBnZXRQcm9jZXNzZWRFdmVudFRyaWdnZXIoX3R5cGU6IEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSk6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciB7XHJcbiAgICAgIGlmICghdGhpcy5ldmVudHNQcm9jZXNzZWQuaGFzKF90eXBlKSkge1xyXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XHJcbiAgICAgICAgbGV0IGV2OiBBbmltYXRpb25FdmVudFRyaWdnZXIgPSB7fTtcclxuICAgICAgICBzd2l0Y2ggKF90eXBlKSB7XHJcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgIGV2ID0gdGhpcy5ldmVudHM7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRTpcclxuICAgICAgICAgICAgZXYgPSB0aGlzLmNhbGN1bGF0ZVJldmVyc2VFdmVudFRyaWdnZXJzKHRoaXMuZXZlbnRzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SQVNURVJFRDpcclxuICAgICAgICAgICAgZXYgPSB0aGlzLmNhbGN1bGF0ZVJhc3RlcmVkRXZlbnRUcmlnZ2Vycyh0aGlzLmV2ZW50cyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRURSRVZFUlNFOlxyXG4gICAgICAgICAgICBldiA9IHRoaXMuY2FsY3VsYXRlUmFzdGVyZWRFdmVudFRyaWdnZXJzKHRoaXMuZ2V0UHJvY2Vzc2VkRXZlbnRUcmlnZ2VyKEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SRVZFUlNFKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmV2ZW50c1Byb2Nlc3NlZC5zZXQoX3R5cGUsIGV2KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdGhpcy5ldmVudHNQcm9jZXNzZWQuZ2V0KF90eXBlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyYXZlcnNlcyBhbiBleGlzdGluZyBzdHJ1Y3R1cmUgdG8gYXBwbHkgYSByZWNhbGN1bGF0aW9uIGZ1bmN0aW9uIHRvIHRoZSBBbmltYXRpb25TdHJ1Y3R1cmUgdG8gc3RvcmUgaW4gYSBuZXcgU3RydWN0dXJlLlxyXG4gICAgICogQHBhcmFtIF9vbGRTdHJ1Y3R1cmUgVGhlIG9sZCBzdHJ1Y3R1cmUgdG8gdHJhdmVyc2VcclxuICAgICAqIEBwYXJhbSBfZnVuY3Rpb25Ub1VzZSBUaGUgZnVuY3Rpb24gdG8gdXNlIHRvIHJlY2FsY3VsYXRlZCB0aGUgc3RydWN0dXJlLlxyXG4gICAgICogQHJldHVybnMgQSBuZXcgQW5pbWF0aW9uIFN0cnVjdHVyZSB3aXRoIHRoZSByZWNhbHVsYXRlZCBBbmltYXRpb24gU2VxdWVuY2VzLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKF9vbGRTdHJ1Y3R1cmU6IEFuaW1hdGlvblN0cnVjdHVyZSwgX2Z1bmN0aW9uVG9Vc2U6IEZ1bmN0aW9uKTogQW5pbWF0aW9uU3RydWN0dXJlIHtcclxuICAgICAgbGV0IG5ld1N0cnVjdHVyZTogQW5pbWF0aW9uU3RydWN0dXJlID0ge307XHJcbiAgICAgIGZvciAobGV0IG4gaW4gX29sZFN0cnVjdHVyZSkge1xyXG4gICAgICAgIGlmIChfb2xkU3RydWN0dXJlW25dIGluc3RhbmNlb2YgQW5pbWF0aW9uU2VxdWVuY2UpIHtcclxuICAgICAgICAgIG5ld1N0cnVjdHVyZVtuXSA9IF9mdW5jdGlvblRvVXNlKF9vbGRTdHJ1Y3R1cmVbbl0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBuZXdTdHJ1Y3R1cmVbbl0gPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKDxBbmltYXRpb25TdHJ1Y3R1cmU+X29sZFN0cnVjdHVyZVtuXSwgX2Z1bmN0aW9uVG9Vc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbmV3U3RydWN0dXJlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIHJldmVyc2VkIEFuaW1hdGlvbiBTZXF1ZW5jZSBvdXQgb2YgYSBnaXZlbiBTZXF1ZW5jZS5cclxuICAgICAqIEBwYXJhbSBfc2VxdWVuY2UgVGhlIHNlcXVlbmNlIHRvIGNhbGN1bGF0ZSB0aGUgbmV3IHNlcXVlbmNlIG91dCBvZlxyXG4gICAgICogQHJldHVybnMgVGhlIHJldmVyc2VkIFNlcXVlbmNlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2FsY3VsYXRlUmV2ZXJzZVNlcXVlbmNlKF9zZXF1ZW5jZTogQW5pbWF0aW9uU2VxdWVuY2UpOiBBbmltYXRpb25TZXF1ZW5jZSB7XHJcbiAgICAgIGxldCBzZXE6IEFuaW1hdGlvblNlcXVlbmNlID0gbmV3IEFuaW1hdGlvblNlcXVlbmNlKCk7XHJcbiAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBfc2VxdWVuY2UubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBsZXQgb2xkS2V5OiBBbmltYXRpb25LZXkgPSBfc2VxdWVuY2UuZ2V0S2V5KGkpO1xyXG4gICAgICAgIGxldCBrZXk6IEFuaW1hdGlvbktleSA9IG5ldyBBbmltYXRpb25LZXkodGhpcy50b3RhbFRpbWUgLSBvbGRLZXkuVGltZSwgb2xkS2V5LlZhbHVlLCBvbGRLZXkuU2xvcGVPdXQsIG9sZEtleS5TbG9wZUluLCBvbGRLZXkuQ29uc3RhbnQpO1xyXG4gICAgICAgIHNlcS5hZGRLZXkoa2V5KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc2VxO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIHJhc3RlcmVkIFtbQW5pbWF0aW9uU2VxdWVuY2VdXSBvdXQgb2YgYSBnaXZlbiBzZXF1ZW5jZS5cclxuICAgICAqIEBwYXJhbSBfc2VxdWVuY2UgVGhlIHNlcXVlbmNlIHRvIGNhbGN1bGF0ZSB0aGUgbmV3IHNlcXVlbmNlIG91dCBvZlxyXG4gICAgICogQHJldHVybnMgdGhlIHJhc3RlcmVkIHNlcXVlbmNlLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNhbGN1bGF0ZVJhc3RlcmVkU2VxdWVuY2UoX3NlcXVlbmNlOiBBbmltYXRpb25TZXF1ZW5jZSk6IEFuaW1hdGlvblNlcXVlbmNlIHtcclxuICAgICAgbGV0IHNlcTogQW5pbWF0aW9uU2VxdWVuY2UgPSBuZXcgQW5pbWF0aW9uU2VxdWVuY2UoKTtcclxuICAgICAgbGV0IGZyYW1lVGltZTogbnVtYmVyID0gMTAwMCAvIHRoaXMuZnJhbWVzUGVyU2Vjb25kO1xyXG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgdGhpcy50b3RhbFRpbWU7IGkgKz0gZnJhbWVUaW1lKSB7XHJcbiAgICAgICAgbGV0IGtleTogQW5pbWF0aW9uS2V5ID0gbmV3IEFuaW1hdGlvbktleShpLCBfc2VxdWVuY2UuZXZhbHVhdGUoaSksIDAsIDAsIHRydWUpO1xyXG4gICAgICAgIHNlcS5hZGRLZXkoa2V5KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc2VxO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIG5ldyByZXZlcnNlZCBbW0FuaW1hdGlvbkV2ZW50VHJpZ2dlcl1dIG9iamVjdCBiYXNlZCBvbiB0aGUgZ2l2ZW4gb25lLiAgXHJcbiAgICAgKiBAcGFyYW0gX2V2ZW50cyB0aGUgZXZlbnQgb2JqZWN0IHRvIGNhbGN1bGF0ZSB0aGUgbmV3IG9uZSBvdXQgb2ZcclxuICAgICAqIEByZXR1cm5zIHRoZSByZXZlcnNlZCBldmVudCBvYmplY3RcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjYWxjdWxhdGVSZXZlcnNlRXZlbnRUcmlnZ2VycyhfZXZlbnRzOiBBbmltYXRpb25FdmVudFRyaWdnZXIpOiBBbmltYXRpb25FdmVudFRyaWdnZXIge1xyXG4gICAgICBsZXQgYWU6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHt9O1xyXG4gICAgICBmb3IgKGxldCBuYW1lIGluIF9ldmVudHMpIHtcclxuICAgICAgICBhZVtuYW1lXSA9IHRoaXMudG90YWxUaW1lIC0gX2V2ZW50c1tuYW1lXTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gYWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIHJhc3RlcmVkIFtbQW5pbWF0aW9uRXZlbnRUcmlnZ2VyXV0gb2JqZWN0IGJhc2VkIG9uIHRoZSBnaXZlbiBvbmUuICBcclxuICAgICAqIEBwYXJhbSBfZXZlbnRzIHRoZSBldmVudCBvYmplY3QgdG8gY2FsY3VsYXRlIHRoZSBuZXcgb25lIG91dCBvZlxyXG4gICAgICogQHJldHVybnMgdGhlIHJhc3RlcmVkIGV2ZW50IG9iamVjdFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNhbGN1bGF0ZVJhc3RlcmVkRXZlbnRUcmlnZ2VycyhfZXZlbnRzOiBBbmltYXRpb25FdmVudFRyaWdnZXIpOiBBbmltYXRpb25FdmVudFRyaWdnZXIge1xyXG4gICAgICBsZXQgYWU6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHt9O1xyXG4gICAgICBsZXQgZnJhbWVUaW1lOiBudW1iZXIgPSAxMDAwIC8gdGhpcy5mcmFtZXNQZXJTZWNvbmQ7XHJcbiAgICAgIGZvciAobGV0IG5hbWUgaW4gX2V2ZW50cykge1xyXG4gICAgICAgIGFlW25hbWVdID0gX2V2ZW50c1tuYW1lXSAtIChfZXZlbnRzW25hbWVdICUgZnJhbWVUaW1lKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gYWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQ2hlY2tzIHdoaWNoIGV2ZW50cyBsYXkgYmV0d2VlbiB0d28gZ2l2ZW4gdGltZXMgYW5kIHJldHVybnMgdGhlIG5hbWVzIG9mIHRoZSBvbmVzIHRoYXQgZG8uXHJcbiAgICAgKiBAcGFyYW0gX2V2ZW50VHJpZ2dlcnMgVGhlIGV2ZW50IG9iamVjdCB0byBjaGVjayB0aGUgZXZlbnRzIGluc2lkZSBvZlxyXG4gICAgICogQHBhcmFtIF9taW4gdGhlIG1pbmltdW0gb2YgdGhlIHJhbmdlIHRvIGNoZWNrIGJldHdlZW4gKGluY2x1c2l2ZSlcclxuICAgICAqIEBwYXJhbSBfbWF4IHRoZSBtYXhpbXVtIG9mIHRoZSByYW5nZSB0byBjaGVjayBiZXR3ZWVuIChleGNsdXNpdmUpXHJcbiAgICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiB0aGUgbmFtZXMgb2YgdGhlIGV2ZW50cyBpbiB0aGUgZ2l2ZW4gcmFuZ2UuIFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNoZWNrRXZlbnRzQmV0d2VlbihfZXZlbnRUcmlnZ2VyczogQW5pbWF0aW9uRXZlbnRUcmlnZ2VyLCBfbWluOiBudW1iZXIsIF9tYXg6IG51bWJlcik6IHN0cmluZ1tdIHtcclxuICAgICAgbGV0IGV2ZW50c1RvVHJpZ2dlcjogc3RyaW5nW10gPSBbXTtcclxuICAgICAgZm9yIChsZXQgbmFtZSBpbiBfZXZlbnRUcmlnZ2Vycykge1xyXG4gICAgICAgIGlmIChfbWluIDw9IF9ldmVudFRyaWdnZXJzW25hbWVdICYmIF9ldmVudFRyaWdnZXJzW25hbWVdIDwgX21heCkge1xyXG4gICAgICAgICAgZXZlbnRzVG9UcmlnZ2VyLnB1c2gobmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBldmVudHNUb1RyaWdnZXI7XHJcbiAgICB9XHJcbiAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHNcIi8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9NdXRhYmxlLnRzXCIvPlxyXG5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlcyB0aGUgdmFsdWVzIGJldHdlZW4gW1tBbmltYXRpb25LZXldXXMuXHJcbiAgICogUmVwcmVzZW50ZWQgaW50ZXJuYWxseSBieSBhIGN1YmljIGZ1bmN0aW9uIChgZih4KSA9IGF4wrMgKyBieMKyICsgY3ggKyBkYCkuIFxyXG4gICAqIE9ubHkgbmVlZHMgdG8gYmUgcmVjYWxjdWxhdGVkIHdoZW4gdGhlIGtleXMgY2hhbmdlLCBzbyBhdCBydW50aW1lIGl0IHNob3VsZCBvbmx5IGJlIGNhbGN1bGF0ZWQgb25jZS5cclxuICAgKiBAYXV0aG9yIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XHJcbiAgICovXHJcbiAgZXhwb3J0IGNsYXNzIEFuaW1hdGlvbkZ1bmN0aW9uIHtcclxuICAgIHByaXZhdGUgYTogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgYjogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgYzogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgZDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUga2V5SW46IEFuaW1hdGlvbktleTtcclxuICAgIHByaXZhdGUga2V5T3V0OiBBbmltYXRpb25LZXk7XHJcblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKF9rZXlJbjogQW5pbWF0aW9uS2V5LCBfa2V5T3V0OiBBbmltYXRpb25LZXkgPSBudWxsKSB7XHJcbiAgICAgIHRoaXMua2V5SW4gPSBfa2V5SW47XHJcbiAgICAgIHRoaXMua2V5T3V0ID0gX2tleU91dDtcclxuICAgICAgdGhpcy5jYWxjdWxhdGUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBhdCB0aGUgZ2l2ZW4gdGltZS5cclxuICAgICAqIEBwYXJhbSBfdGltZSB0aGUgcG9pbnQgaW4gdGltZSBhdCB3aGljaCB0byBldmFsdWF0ZSB0aGUgZnVuY3Rpb24gaW4gbWlsbGlzZWNvbmRzLiBXaWxsIGJlIGNvcnJlY3RlZCBmb3Igb2Zmc2V0IGludGVybmFsbHkuXHJcbiAgICAgKiBAcmV0dXJucyB0aGUgdmFsdWUgYXQgdGhlIGdpdmVuIHRpbWVcclxuICAgICAqL1xyXG4gICAgZXZhbHVhdGUoX3RpbWU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgIF90aW1lIC09IHRoaXMua2V5SW4uVGltZTtcclxuICAgICAgbGV0IHRpbWUyOiBudW1iZXIgPSBfdGltZSAqIF90aW1lO1xyXG4gICAgICBsZXQgdGltZTM6IG51bWJlciA9IHRpbWUyICogX3RpbWU7XHJcbiAgICAgIHJldHVybiB0aGlzLmEgKiB0aW1lMyArIHRoaXMuYiAqIHRpbWUyICsgdGhpcy5jICogX3RpbWUgKyB0aGlzLmQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IHNldEtleUluKF9rZXlJbjogQW5pbWF0aW9uS2V5KSB7XHJcbiAgICAgIHRoaXMua2V5SW4gPSBfa2V5SW47XHJcbiAgICAgIHRoaXMuY2FsY3VsYXRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IHNldEtleU91dChfa2V5T3V0OiBBbmltYXRpb25LZXkpIHtcclxuICAgICAgdGhpcy5rZXlPdXQgPSBfa2V5T3V0O1xyXG4gICAgICB0aGlzLmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogKFJlLSlDYWxjdWxhdGVzIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjdWJpYyBmdW5jdGlvbi5cclxuICAgICAqIFNlZSBodHRwczovL21hdGguc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzMxNzM0NjkvY2FsY3VsYXRlLWN1YmljLWVxdWF0aW9uLWZyb20tdHdvLXBvaW50cy1hbmQtdHdvLXNsb3Blcy12YXJpYWJseVxyXG4gICAgICogYW5kIGh0dHBzOi8vamlya2FkZWxsb3JvLmdpdGh1Yi5pby9GVURHRS9Eb2N1bWVudGF0aW9uL0xvZ3MvMTkwNDEwX05vdGl6ZW5fTFNcclxuICAgICAqL1xyXG4gICAgY2FsY3VsYXRlKCk6IHZvaWQge1xyXG4gICAgICBpZiAoIXRoaXMua2V5SW4pIHtcclxuICAgICAgICB0aGlzLmQgPSB0aGlzLmMgPSB0aGlzLmIgPSB0aGlzLmEgPSAwO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBpZiAoIXRoaXMua2V5T3V0IHx8IHRoaXMua2V5SW4uQ29uc3RhbnQpIHtcclxuICAgICAgICB0aGlzLmQgPSB0aGlzLmtleUluLlZhbHVlO1xyXG4gICAgICAgIHRoaXMuYyA9IHRoaXMuYiA9IHRoaXMuYSA9IDA7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsZXQgeDE6IG51bWJlciA9IHRoaXMua2V5T3V0LlRpbWUgLSB0aGlzLmtleUluLlRpbWU7XHJcblxyXG4gICAgICB0aGlzLmQgPSB0aGlzLmtleUluLlZhbHVlO1xyXG4gICAgICB0aGlzLmMgPSB0aGlzLmtleUluLlNsb3BlT3V0O1xyXG5cclxuICAgICAgdGhpcy5hID0gKC14MSAqICh0aGlzLmtleUluLlNsb3BlT3V0ICsgdGhpcy5rZXlPdXQuU2xvcGVJbikgLSAyICogdGhpcy5rZXlJbi5WYWx1ZSArIDIgKiB0aGlzLmtleU91dC5WYWx1ZSkgLyAtTWF0aC5wb3coeDEsIDMpO1xyXG4gICAgICB0aGlzLmIgPSAodGhpcy5rZXlPdXQuU2xvcGVJbiAtIHRoaXMua2V5SW4uU2xvcGVPdXQgLSAzICogdGhpcy5hICogTWF0aC5wb3coeDEsIDIpKSAvICgyICogeDEpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvU2VyaWFsaXplci50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL011dGFibGUudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAvKipcclxuICAgKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCBzZXQgcG9pbnRzIGluIHRpbWUsIHRoZWlyIGFjY29tcGFueWluZyB2YWx1ZXMgYXMgd2VsbCBhcyB0aGVpciBzbG9wZXMuIFxyXG4gICAqIEFsc28gaG9sZHMgYSByZWZlcmVuY2UgdG8gdGhlIFtbQW5pbWF0aW9uRnVuY3Rpb25dXXMgdGhhdCBjb21lIGluIGFuZCBvdXQgb2YgdGhlIHNpZGVzLiBUaGUgW1tBbmltYXRpb25GdW5jdGlvbl1dcyBhcmUgaGFuZGxlZCBieSB0aGUgW1tBbmltYXRpb25TZXF1ZW5jZV1dcy5cclxuICAgKiBTYXZlZCBpbnNpZGUgYW4gW1tBbmltYXRpb25TZXF1ZW5jZV1dLlxyXG4gICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcclxuICAgKi9cclxuICBleHBvcnQgY2xhc3MgQW5pbWF0aW9uS2V5IGV4dGVuZHMgTXV0YWJsZSBpbXBsZW1lbnRzIFNlcmlhbGl6YWJsZSB7XHJcbiAgICAvLyBUT0RPOiBjaGVjayBpZiBmdW5jdGlvbkluIGNhbiBiZSByZW1vdmVkXHJcbiAgICAvKipEb24ndCBtb2RpZnkgdGhpcyB1bmxlc3MgeW91IGtub3cgd2hhdCB5b3UncmUgZG9pbmcuKi9cclxuICAgIGZ1bmN0aW9uSW46IEFuaW1hdGlvbkZ1bmN0aW9uO1xyXG4gICAgLyoqRG9uJ3QgbW9kaWZ5IHRoaXMgdW5sZXNzIHlvdSBrbm93IHdoYXQgeW91J3JlIGRvaW5nLiovXHJcbiAgICBmdW5jdGlvbk91dDogQW5pbWF0aW9uRnVuY3Rpb247XHJcbiAgICBcclxuICAgIGJyb2tlbjogYm9vbGVhbjtcclxuXHJcbiAgICBwcml2YXRlIHRpbWU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgdmFsdWU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgY29uc3RhbnQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBwcml2YXRlIHNsb3BlSW46IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIHNsb3BlT3V0OiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKF90aW1lOiBudW1iZXIgPSAwLCBfdmFsdWU6IG51bWJlciA9IDAsIF9zbG9wZUluOiBudW1iZXIgPSAwLCBfc2xvcGVPdXQ6IG51bWJlciA9IDAsIF9jb25zdGFudDogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICAgIHN1cGVyKCk7XHJcbiAgICAgIHRoaXMudGltZSA9IF90aW1lO1xyXG4gICAgICB0aGlzLnZhbHVlID0gX3ZhbHVlO1xyXG4gICAgICB0aGlzLnNsb3BlSW4gPSBfc2xvcGVJbjtcclxuICAgICAgdGhpcy5zbG9wZU91dCA9IF9zbG9wZU91dDtcclxuICAgICAgdGhpcy5jb25zdGFudCA9IF9jb25zdGFudDtcclxuXHJcbiAgICAgIHRoaXMuYnJva2VuID0gdGhpcy5zbG9wZUluICE9IC10aGlzLnNsb3BlT3V0O1xyXG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0ID0gbmV3IEFuaW1hdGlvbkZ1bmN0aW9uKHRoaXMsIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBUaW1lKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLnRpbWU7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IFRpbWUoX3RpbWU6IG51bWJlcikge1xyXG4gICAgICB0aGlzLnRpbWUgPSBfdGltZTtcclxuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xyXG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0LmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBWYWx1ZSgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy52YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgVmFsdWUoX3ZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgdGhpcy52YWx1ZSA9IF92YWx1ZTtcclxuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xyXG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0LmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBnZXQgQ29uc3RhbnQoKTogYm9vbGVhbiB7XHJcbiAgICAgIHJldHVybiB0aGlzLmNvbnN0YW50O1xyXG4gICAgfVxyXG5cclxuICAgIHNldCBDb25zdGFudChfY29uc3RhbnQ6IGJvb2xlYW4pIHtcclxuICAgICAgdGhpcy5jb25zdGFudCA9IF9jb25zdGFudDtcclxuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xyXG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0LmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBTbG9wZUluKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLnNsb3BlSW47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNldCBTbG9wZUluKF9zbG9wZTogbnVtYmVyKSB7XHJcbiAgICAgIHRoaXMuc2xvcGVJbiA9IF9zbG9wZTtcclxuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBTbG9wZU91dCgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy5zbG9wZU91dDtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgU2xvcGVPdXQoX3Nsb3BlOiBudW1iZXIpIHtcclxuICAgICAgdGhpcy5zbG9wZU91dCA9IF9zbG9wZTtcclxuICAgICAgdGhpcy5mdW5jdGlvbk91dC5jYWxjdWxhdGUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFN0YXRpYyBjb21wYXJhdGlvbiBmdW5jdGlvbiB0byB1c2UgaW4gYW4gYXJyYXkgc29ydCBmdW5jdGlvbiB0byBzb3J0IHRoZSBrZXlzIGJ5IHRoZWlyIHRpbWUuXHJcbiAgICAgKiBAcGFyYW0gX2EgdGhlIGFuaW1hdGlvbiBrZXkgdG8gY2hlY2tcclxuICAgICAqIEBwYXJhbSBfYiB0aGUgYW5pbWF0aW9uIGtleSB0byBjaGVjayBhZ2FpbnN0XHJcbiAgICAgKiBAcmV0dXJucyA+MCBpZiBhPmIsIDAgaWYgYT1iLCA8MCBpZiBhPGJcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGNvbXBhcmUoX2E6IEFuaW1hdGlvbktleSwgX2I6IEFuaW1hdGlvbktleSk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiBfYS50aW1lIC0gX2IudGltZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gdHJhbnNmZXJcclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IHM6IFNlcmlhbGl6YXRpb24gPSB7fTtcclxuICAgICAgcy50aW1lID0gdGhpcy50aW1lO1xyXG4gICAgICBzLnZhbHVlID0gdGhpcy52YWx1ZTtcclxuICAgICAgcy5zbG9wZUluID0gdGhpcy5zbG9wZUluO1xyXG4gICAgICBzLnNsb3BlT3V0ID0gdGhpcy5zbG9wZU91dDtcclxuICAgICAgcy5jb25zdGFudCA9IHRoaXMuY29uc3RhbnQ7XHJcbiAgICAgIHJldHVybiBzO1xyXG4gICAgfVxyXG5cclxuICAgIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgdGhpcy50aW1lID0gX3NlcmlhbGl6YXRpb24udGltZTtcclxuICAgICAgdGhpcy52YWx1ZSA9IF9zZXJpYWxpemF0aW9uLnZhbHVlO1xyXG4gICAgICB0aGlzLnNsb3BlSW4gPSBfc2VyaWFsaXphdGlvbi5zbG9wZUluO1xyXG4gICAgICB0aGlzLnNsb3BlT3V0ID0gX3NlcmlhbGl6YXRpb24uc2xvcGVPdXQ7XHJcbiAgICAgIHRoaXMuY29uc3RhbnQgPSBfc2VyaWFsaXphdGlvbi5jb25zdGFudDtcclxuXHJcbiAgICAgIHRoaXMuYnJva2VuID0gdGhpcy5zbG9wZUluICE9IC10aGlzLnNsb3BlT3V0O1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TXV0YXRvcigpOiBNdXRhdG9yIHtcclxuICAgICAgcmV0dXJuIHRoaXMuc2VyaWFsaXplKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgLy9cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICB9XHJcblxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHNcIi8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9NdXRhYmxlLnRzXCIvPlxyXG5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgLyoqXHJcbiAgICogQSBzZXF1ZW5jZSBvZiBbW0FuaW1hdGlvbktleV1dcyB0aGF0IGlzIG1hcHBlZCB0byBhbiBhdHRyaWJ1dGUgb2YgYSBbW05vZGVdXSBvciBpdHMgW1tDb21wb25lbnRdXXMgaW5zaWRlIHRoZSBbW0FuaW1hdGlvbl1dLlxyXG4gICAqIFByb3ZpZGVzIGZ1bmN0aW9ucyB0byBtb2RpZnkgc2FpZCBrZXlzXHJcbiAgICogQGF1dGhvciBMdWthcyBTY2hldWVybGUsIEhGVSwgMjAxOVxyXG4gICAqL1xyXG4gIGV4cG9ydCBjbGFzcyBBbmltYXRpb25TZXF1ZW5jZSBleHRlbmRzIE11dGFibGUgaW1wbGVtZW50cyBTZXJpYWxpemFibGUge1xyXG4gICAgcHJpdmF0ZSBrZXlzOiBBbmltYXRpb25LZXlbXSA9IFtdO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXZhbHVhdGVzIHRoZSBzZXF1ZW5jZSBhdCB0aGUgZ2l2ZW4gcG9pbnQgaW4gdGltZS5cclxuICAgICAqIEBwYXJhbSBfdGltZSB0aGUgcG9pbnQgaW4gdGltZSBhdCB3aGljaCB0byBldmFsdWF0ZSB0aGUgc2VxdWVuY2UgaW4gbWlsbGlzZWNvbmRzLlxyXG4gICAgICogQHJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBzZXF1ZW5jZSBhdCB0aGUgZ2l2ZW4gdGltZS4gMCBpZiB0aGVyZSBhcmUgbm8ga2V5cy5cclxuICAgICAqL1xyXG4gICAgZXZhbHVhdGUoX3RpbWU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgIGlmICh0aGlzLmtleXMubGVuZ3RoID09IDApXHJcbiAgICAgICAgcmV0dXJuIDA7IC8vVE9ETzogc2hvdWxkbid0IHJldHVybiAwIGJ1dCBzb21ldGhpbmcgaW5kaWNhdGluZyBubyBjaGFuZ2UsIGxpa2UgbnVsbC4gcHJvYmFibHkgbmVlZHMgdG8gYmUgY2hhbmdlZCBpbiBOb2RlIGFzIHdlbGwgdG8gaWdub3JlIG5vbi1udW1lcmljIHZhbHVlcyBpbiB0aGUgYXBwbHlBbmltYXRpb24gZnVuY3Rpb25cclxuICAgICAgaWYgKHRoaXMua2V5cy5sZW5ndGggPT0gMSB8fCB0aGlzLmtleXNbMF0uVGltZSA+PSBfdGltZSlcclxuICAgICAgICByZXR1cm4gdGhpcy5rZXlzWzBdLlZhbHVlO1xyXG5cclxuXHJcbiAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCB0aGlzLmtleXMubGVuZ3RoIC0gMTsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRoaXMua2V5c1tpXS5UaW1lIDw9IF90aW1lICYmIHRoaXMua2V5c1tpICsgMV0uVGltZSA+IF90aW1lKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5rZXlzW2ldLmZ1bmN0aW9uT3V0LmV2YWx1YXRlKF90aW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXMua2V5c1t0aGlzLmtleXMubGVuZ3RoIC0gMV0uVmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGRzIGEgbmV3IGtleSB0byB0aGUgc2VxdWVuY2UuXHJcbiAgICAgKiBAcGFyYW0gX2tleSB0aGUga2V5IHRvIGFkZFxyXG4gICAgICovXHJcbiAgICBhZGRLZXkoX2tleTogQW5pbWF0aW9uS2V5KTogdm9pZCB7XHJcbiAgICAgIHRoaXMua2V5cy5wdXNoKF9rZXkpO1xyXG4gICAgICB0aGlzLmtleXMuc29ydChBbmltYXRpb25LZXkuY29tcGFyZSk7XHJcbiAgICAgIHRoaXMucmVnZW5lcmF0ZUZ1bmN0aW9ucygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyBhIGdpdmVuIGtleSBmcm9tIHRoZSBzZXF1ZW5jZS5cclxuICAgICAqIEBwYXJhbSBfa2V5IHRoZSBrZXkgdG8gcmVtb3ZlXHJcbiAgICAgKi9cclxuICAgIHJlbW92ZUtleShfa2V5OiBBbmltYXRpb25LZXkpOiB2b2lkIHtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHRoaXMua2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmICh0aGlzLmtleXNbaV0gPT0gX2tleSkge1xyXG4gICAgICAgICAgdGhpcy5rZXlzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgIHRoaXMucmVnZW5lcmF0ZUZ1bmN0aW9ucygpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyB0aGUgQW5pbWF0aW9uIEtleSBhdCB0aGUgZ2l2ZW4gaW5kZXggZnJvbSB0aGUga2V5cy5cclxuICAgICAqIEBwYXJhbSBfaW5kZXggdGhlIHplcm8tYmFzZWQgaW5kZXggYXQgd2hpY2ggdG8gcmVtb3ZlIHRoZSBrZXlcclxuICAgICAqIEByZXR1cm5zIHRoZSByZW1vdmVkIEFuaW1hdGlvbktleSBpZiBzdWNjZXNzZnVsLCBudWxsIG90aGVyd2lzZS5cclxuICAgICAqL1xyXG4gICAgcmVtb3ZlS2V5QXRJbmRleChfaW5kZXg6IG51bWJlcik6IEFuaW1hdGlvbktleSB7XHJcbiAgICAgIGlmIChfaW5kZXggPCAwIHx8IF9pbmRleCA+PSB0aGlzLmtleXMubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuICAgICAgbGV0IGFrOiBBbmltYXRpb25LZXkgPSB0aGlzLmtleXNbX2luZGV4XTtcclxuICAgICAgdGhpcy5rZXlzLnNwbGljZShfaW5kZXgsIDEpO1xyXG4gICAgICB0aGlzLnJlZ2VuZXJhdGVGdW5jdGlvbnMoKTtcclxuICAgICAgcmV0dXJuIGFrO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0cyBhIGtleSBmcm9tIHRoZSBzZXF1ZW5jZSBhdCB0aGUgZGVzaXJlZCBpbmRleC5cclxuICAgICAqIEBwYXJhbSBfaW5kZXggdGhlIHplcm8tYmFzZWQgaW5kZXggYXQgd2hpY2ggdG8gZ2V0IHRoZSBrZXlcclxuICAgICAqIEByZXR1cm5zIHRoZSBBbmltYXRpb25LZXkgYXQgdGhlIGluZGV4IGlmIGl0IGV4aXN0cywgbnVsbCBvdGhlcndpc2UuXHJcbiAgICAgKi9cclxuICAgIGdldEtleShfaW5kZXg6IG51bWJlcik6IEFuaW1hdGlvbktleSB7XHJcbiAgICAgIGlmIChfaW5kZXggPCAwIHx8IF9pbmRleCA+PSB0aGlzLmtleXMubGVuZ3RoKVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICByZXR1cm4gdGhpcy5rZXlzW19pbmRleF07XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy5rZXlzLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gdHJhbnNmZXJcclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IHM6IFNlcmlhbGl6YXRpb24gPSB7XHJcbiAgICAgICAga2V5czogW10sXHJcbiAgICAgICAgYW5pbWF0aW9uU2VxdWVuY2U6IHRydWVcclxuICAgICAgfTtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHRoaXMua2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHMua2V5c1tpXSA9IHRoaXMua2V5c1tpXS5zZXJpYWxpemUoKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcztcclxuICAgIH1cclxuICAgIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IF9zZXJpYWxpemF0aW9uLmtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAvLyB0aGlzLmtleXMucHVzaCg8QW5pbWF0aW9uS2V5PlNlcmlhbGl6ZXIuZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb24ua2V5c1tpXSkpO1xyXG4gICAgICAgIGxldCBrOiBBbmltYXRpb25LZXkgPSBuZXcgQW5pbWF0aW9uS2V5KCk7XHJcbiAgICAgICAgay5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbi5rZXlzW2ldKTtcclxuICAgICAgICB0aGlzLmtleXNbaV0gPSBrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnJlZ2VuZXJhdGVGdW5jdGlvbnMoKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xyXG4gICAgICAvL1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVdGlsaXR5IGZ1bmN0aW9uIHRoYXQgKHJlLSlnZW5lcmF0ZXMgYWxsIGZ1bmN0aW9ucyBpbiB0aGUgc2VxdWVuY2UuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgcmVnZW5lcmF0ZUZ1bmN0aW9ucygpOiB2b2lkIHtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHRoaXMua2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGxldCBmOiBBbmltYXRpb25GdW5jdGlvbiA9IG5ldyBBbmltYXRpb25GdW5jdGlvbih0aGlzLmtleXNbaV0pO1xyXG4gICAgICAgIHRoaXMua2V5c1tpXS5mdW5jdGlvbk91dCA9IGY7XHJcbiAgICAgICAgaWYgKGkgPT0gdGhpcy5rZXlzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgIC8vVE9ETzogY2hlY2sgaWYgdGhpcyBpcyBldmVuIHVzZWZ1bC4gTWF5YmUgdXBkYXRlIHRoZSBydW5jb25kaXRpb24gdG8gbGVuZ3RoIC0gMSBpbnN0ZWFkLiBNaWdodCBiZSByZWR1bmRhbnQgaWYgZnVuY3Rpb25JbiBpcyByZW1vdmVkLCBzZWUgVE9ETyBpbiBBbmltYXRpb25LZXkuXHJcbiAgICAgICAgICBmLnNldEtleU91dCA9IHRoaXMua2V5c1swXTtcclxuICAgICAgICAgIHRoaXMua2V5c1swXS5mdW5jdGlvbkluID0gZjtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmLnNldEtleU91dCA9IHRoaXMua2V5c1tpICsgMV07XHJcbiAgICAgICAgdGhpcy5rZXlzW2kgKyAxXS5mdW5jdGlvbkluID0gZjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBEZXNjcmliZXMgdGhlIFtbQXVkaW9dXSBjbGFzcyBpbiB3aGljaCBhbGwgQXVkaW8gRGF0YSBpcyBzdG9yZWQuXHJcbiAgICAgKiBBdWRpbyB3aWxsIGJlIGdpdmVuIHRvIHRoZSBbW0NvbXBvbmVudEF1ZGlvXV0gZm9yIGZ1cnRoZXIgdXNhZ2UuXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF1ZGlvIHtcclxuXHJcbiAgICAgICAgcHVibGljIHVybDogc3RyaW5nO1xyXG5cclxuICAgICAgICBwdWJsaWMgYXVkaW9CdWZmZXI6IEF1ZGlvQnVmZmVyO1xyXG4gICAgICAgIHByaXZhdGUgYnVmZmVyU291cmNlOiBBdWRpb0J1ZmZlclNvdXJjZU5vZGU7XHJcblxyXG4gICAgICAgIHByaXZhdGUgbG9jYWxHYWluOiBHYWluTm9kZTtcclxuICAgICAgICBwcml2YXRlIGxvY2FsR2FpblZhbHVlOiBudW1iZXI7XHJcblxyXG4gICAgICAgIHByaXZhdGUgaXNMb29waW5nOiBib29sZWFuO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb25zdHJ1Y3RvciBmb3IgdGhlIFtbQXVkaW9dXSBDbGFzc1xyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9Db250ZXh0IGZyb20gW1tBdWRpb1NldHRpbmdzXV1cclxuICAgICAgICAgKiBAcGFyYW0gX2dhaW5WYWx1ZSAwIGZvciBtdXRlZCB8IDEgZm9yIG1heCB2b2x1bWVcclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdHJ1Y3RvcihfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX3VybDogc3RyaW5nLCBfZ2FpblZhbHVlOiBudW1iZXIsIF9sb29wOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdChfYXVkaW9TZXR0aW5ncywgX3VybCwgX2dhaW5WYWx1ZSwgX2xvb3ApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGFzeW5jIGluaXQoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF91cmw6IHN0cmluZywgX2dhaW5WYWx1ZTogbnVtYmVyLCBfbG9vcDogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgICAgICB0aGlzLnVybCA9IF91cmw7XHJcbiAgICAgICAgICAgIC8vIEdldCBBdWRpb0J1ZmZlclxyXG4gICAgICAgICAgICBjb25zdCBidWZmZXJQcm9tOiBQcm9taXNlPEF1ZGlvQnVmZmVyPiA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvU2Vzc2lvbigpLnVybFRvQnVmZmVyKF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLCBfdXJsKTtcclxuICAgICAgICAgICAgd2hpbGUgKCFidWZmZXJQcm9tKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIldhaXRpbmcgZm9yIFByb21pc2UuLlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhd2FpdCBidWZmZXJQcm9tLnRoZW4odmFsID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9CdWZmZXIgPSB2YWw7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4gPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVHYWluKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluVmFsdWUgPSBfZ2FpblZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLmxvY2FsR2Fpbi5nYWluLnZhbHVlID0gdGhpcy5sb2NhbEdhaW5WYWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5jcmVhdGVBdWRpbyhfYXVkaW9TZXR0aW5ncywgdGhpcy5hdWRpb0J1ZmZlcik7XHJcbiAgICAgICAgICAgIHRoaXMuaXNMb29waW5nID0gX2xvb3A7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgaW5pdEJ1ZmZlclNvdXJjZShfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJ1ZmZlclNvdXJjZSA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmJ1ZmZlclNvdXJjZS5idWZmZXIgPSB0aGlzLmF1ZGlvQnVmZmVyO1xyXG4gICAgICAgICAgICB0aGlzLmJlZ2luTG9vcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEJ1ZmZlclNvdXJjZU5vZGUoX2J1ZmZlclNvdXJjZU5vZGU6IEF1ZGlvQnVmZmVyU291cmNlTm9kZSk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJ1ZmZlclNvdXJjZSA9IF9idWZmZXJTb3VyY2VOb2RlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEJ1ZmZlclNvdXJjZU5vZGUoKTogQXVkaW9CdWZmZXJTb3VyY2VOb2RlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyU291cmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldExvY2FsR2FpbihfbG9jYWxHYWluOiBHYWluTm9kZSk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmxvY2FsR2FpbiA9IF9sb2NhbEdhaW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TG9jYWxHYWluKCk6IEdhaW5Ob2RlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxHYWluO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldExvY2FsR2FpblZhbHVlKF9sb2NhbEdhaW5WYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluVmFsdWUgPSBfbG9jYWxHYWluVmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluLmdhaW4udmFsdWUgPSB0aGlzLmxvY2FsR2FpblZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldExvY2FsR2FpblZhbHVlKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsR2FpblZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldExvb3BpbmcoX2lzTG9vcGluZzogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmlzTG9vcGluZyA9IF9pc0xvb3Bpbmc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TG9vcGluZygpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNMb29waW5nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEJ1ZmZlclNvdXJjZShfYnVmZmVyOiBBdWRpb0J1ZmZlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvQnVmZmVyID0gX2J1ZmZlcjtcclxuICAgICAgICAgICAgdGhpcy5idWZmZXJTb3VyY2UuYnVmZmVyID0gX2J1ZmZlcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRCdWZmZXJTb3VyY2UoKTogQXVkaW9CdWZmZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb0J1ZmZlcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIGNyZWF0ZUF1ZGlvIGJ1aWxkcyBhbiBbW0F1ZGlvXV0gdG8gdXNlIHdpdGggdGhlIFtbQ29tcG9uZW50QXVkaW9dXVxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9Db250ZXh0IGZyb20gW1tBdWRpb1NldHRpbmdzXV1cclxuICAgICAgICAgKiBAcGFyYW0gX2F1ZGlvQnVmZmVyIGZyb20gW1tBdWRpb1Nlc3Npb25EYXRhXV1cclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGNyZWF0ZUF1ZGlvKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfYXVkaW9CdWZmZXI6IEF1ZGlvQnVmZmVyKTogQXVkaW9CdWZmZXIge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvQnVmZmVyID0gX2F1ZGlvQnVmZmVyO1xyXG4gICAgICAgICAgICB0aGlzLmluaXRCdWZmZXJTb3VyY2UoX2F1ZGlvU2V0dGluZ3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb0J1ZmZlcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgYmVnaW5Mb29wKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJ1ZmZlclNvdXJjZS5sb29wID0gdGhpcy5pc0xvb3Bpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGQgYW4gW1tBdWRpb0RlbGF5XV0gdG8gYW4gW1tBdWRpb11dXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF1ZGlvRGVsYXkge1xyXG5cclxuICAgICAgICBwdWJsaWMgYXVkaW9EZWxheTogRGVsYXlOb2RlO1xyXG4gICAgICAgIHByaXZhdGUgZGVsYXk6IG51bWJlcjtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdHJ1Y3RvcihfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX2RlbGF5OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0RlbGF5ID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3JlYXRlRGVsYXkoX2RlbGF5KTtcclxuICAgICAgICAgICAgdGhpcy5zZXREZWxheShfYXVkaW9TZXR0aW5ncywgX2RlbGF5KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXREZWxheShfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX2RlbGF5OiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5kZWxheSA9IF9kZWxheTtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0RlbGF5LmRlbGF5VGltZS5zZXRWYWx1ZUF0VGltZSh0aGlzLmRlbGF5LCBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RGVsYXkoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVsYXk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQWxsIHBvc3NpYmxlIEZpbHRlciBUeXBlcyBvZiBhbiBBdWRpbyBGaWx0ZXJcclxuICAgICAqL1xyXG4gICAgdHlwZSBGSUxURVJfVFlQRSA9IFwibG93cGFzc1wiIHwgXCJoaWdocGFzc1wiIHwgXCJiYW5kcGFzc1wiIHwgXCJsb3dzaGVsZlwiIHwgXCJoaWdoc2hlbGZcIiB8IFwicGVha2luZ1wiIHwgXCJub3RjaFwiIHwgXCJhbGxwYXNzXCI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGQgYW4gW1tBdWRpb0ZpbHRlcl1dIHRvIGFuIFtbQXVkaW9dXVxyXG4gICAgICogQGF1dGhvcnMgVGhvbWFzIERvcm5lciwgSEZVLCAyMDE5XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBBdWRpb0ZpbHRlciB7XHJcblxyXG4gICAgICAgIHB1YmxpYyBhdWRpb0ZpbHRlcjogQmlxdWFkRmlsdGVyTm9kZTsgXHJcbiAgICAgICAgcHJpdmF0ZSBmaWx0ZXJUeXBlOiBGSUxURVJfVFlQRTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdHJ1Y3RvcihfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX2ZpbHRlclR5cGU6IEZJTFRFUl9UWVBFLCBfZnJlcXVlbmN5OiBudW1iZXIsIF9nYWluOiBudW1iZXIsIF9xdWFsaXR5OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5pbml0RmlsdGVyKF9hdWRpb1NldHRpbmdzLCBfZmlsdGVyVHlwZSwgX2ZyZXF1ZW5jeSwgX2dhaW4sIF9xdWFsaXR5KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBpbml0RmlsdGVyKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfZmlsdGVyVHlwZTogRklMVEVSX1RZUEUsIF9mcmVxdWVuY3k6IG51bWJlciwgX2dhaW46IG51bWJlciwgX3F1YWxpdHk6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvRmlsdGVyID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0RmlsdGVyVHlwZShfZmlsdGVyVHlwZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0RnJlcXVlbmN5KF9hdWRpb1NldHRpbmdzLCBfZnJlcXVlbmN5KTtcclxuICAgICAgICAgICAgdGhpcy5zZXRHYWluKF9hdWRpb1NldHRpbmdzLCBfZ2Fpbik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0UXVhbGl0eShfcXVhbGl0eSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RmlsdGVyVHlwZShfZmlsdGVyVHlwZTogRklMVEVSX1RZUEUpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5maWx0ZXJUeXBlID0gX2ZpbHRlclR5cGU7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9GaWx0ZXIudHlwZSA9IHRoaXMuZmlsdGVyVHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRGaWx0ZXJUeXBlKCk6IEZJTFRFUl9UWVBFIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyVHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRGcmVxdWVuY3koX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9mcmVxdWVuY3k6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvRmlsdGVyLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShfZnJlcXVlbmN5LCBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RnJlcXVlbmN5KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF1ZGlvRmlsdGVyLmZyZXF1ZW5jeS52YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIHNldEdhaW4oX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9nYWluOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0ZpbHRlci5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoX2dhaW4sIF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmN1cnJlbnRUaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRHYWluKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF1ZGlvRmlsdGVyLmdhaW4udmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBzZXRRdWFsaXR5KF9xdWFsaXR5OiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0ZpbHRlci5RLnZhbHVlID0gX3F1YWxpdHk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0UXVhbGl0eSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb0ZpbHRlci5RLnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBEZXNjcmliZXMgYSBbW0F1ZGlvTGlzdGVuZXJdXSBhdHRhY2hlZCB0byBhIFtbTm9kZV1dXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF1ZGlvTGlzdGVuZXJYIHtcclxuICAgICAgICBwdWJsaWMgYXVkaW9MaXN0ZW5lcjogQXVkaW9MaXN0ZW5lclg7XHJcblxyXG4gICAgICAgIHByaXZhdGUgcG9zaXRpb246IFZlY3RvcjM7XHJcbiAgICAgICAgcHJpdmF0ZSBvcmllbnRhdGlvbjogVmVjdG9yMztcclxuXHJcbiAgICAgICAgLy8jI1RPRE8gQXVkaW9MaXN0ZW5lclxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb0NvbnRleHQ6IEF1ZGlvQ29udGV4dCkge1xyXG4gICAgICAgICAgICAvL3RoaXMuYXVkaW9MaXN0ZW5lciA9IF9hdWRpb0NvbnRleHQubGlzdGVuZXI7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogV2Ugd2lsbCBjYWxsIHNldEF1ZGlvTGlzdGVuZXJQb3NpdGlvbiB3aGVuZXZlciB0aGVyZSBpcyBhIG5lZWQgdG8gY2hhbmdlIFBvc2l0aW9ucy5cclxuICAgICAgICAgKiBBbGwgdGhlIHBvc2l0aW9uIHZhbHVlcyBzaG91bGQgYmUgaWRlbnRpY2FsIHRvIHRoZSBjdXJyZW50IFBvc2l0aW9uIHRoaXMgaXMgYXR0ZWNoZWQgdG8uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgLy8gcHVibGljIHNldEF1ZGlvTGlzdGVuZXJQb3NpdGlvbihfcG9zaXRpb246IFZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAvLyAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWC52YWx1ZSA9IF9wb3NpdGlvbi54O1xyXG4gICAgICAgIC8vICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25ZLnZhbHVlID0gX3Bvc2l0aW9uLnk7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYXVkaW9MaXN0ZW5lci5wb3NpdGlvbloudmFsdWUgPSBfcG9zaXRpb24uejtcclxuXHJcbiAgICAgICAgLy8gICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBnZXRBdWRpb0xpc3RlbmVyUG9zaXRpb25cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0QXVkaW9MaXN0ZW5lclBvc2l0aW9uKCk6IFZlY3RvcjMge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIHNldEF1ZGlvTGlzdGVuZXJPcmllbnRhdGlvblxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIC8vIHB1YmxpYyBzZXRBdWRpb0xpc3RlbmVyT3JpZW50YXRpb24oX29yaWVudGF0aW9uOiBWZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYXVkaW9MaXN0ZW5lci5vcmllbnRhdGlvblgudmFsdWUgPSBfb3JpZW50YXRpb24ueDtcclxuICAgICAgICAvLyAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLm9yaWVudGF0aW9uWS52YWx1ZSA9IF9vcmllbnRhdGlvbi55O1xyXG4gICAgICAgIC8vICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIub3JpZW50YXRpb25aLnZhbHVlID0gX29yaWVudGF0aW9uLno7XHJcblxyXG4gICAgICAgIC8vICAgICB0aGlzLm9yaWVudGF0aW9uID0gX29yaWVudGF0aW9uO1xyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogZ2V0QXVkaW9MaXN0ZW5lck9yaWVudGF0aW9uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldEF1ZGlvTGlzdGVuZXJPcmllbnRhdGlvbigpOiBWZWN0b3IzIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub3JpZW50YXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBVc2UgUG9zaXRpb24gZnJvbSBQYXJlbnQgTm9kZSB0byB1cGRhdGUgb3duIFBvc2l0aW9uIGFjY29yZGluZ2x5XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgLy8gcHJpdmF0ZSBnZXRQYXJlbnROb2RlUG9zaXRpb24oKSB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIC8vIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIFBhbm5pbmcgTW9kZWwgVHlwZSBmb3IgM0QgbG9jYWxpc2F0aW9uIG9mIGEgW1tDb21wb25lbnRBdWRpb11dLlxyXG4gICAgICogQHBhcmFtIEhSRlQgVXN1YWxseSB1c2VkIGZvciAzRCB3b3JsZCBzcGFjZSwgdGhpcyB3aWxsIGJlIHRoZSBkZWZhdWx0IHNldHRpbmdcclxuICAgICAqL1xyXG4gICAgdHlwZSBQQU5OSU5HX01PREVMX1RZUEUgPSBcImVxdWFscG93ZXJcIiB8IFwiSFJURlwiO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGlzdGFuY2UgTW9kZWwgVHlwZSBmb3IgM0QgbG9jYWxpc2F0aW9uIG9mIGEgW1tDb21wb25lbnRBdWRpb11dLlxyXG4gICAgICogQHBhcmFtIGludmVyc2UgVXN1YWxseSB1c2VkIGZvciB2b2x1bWUgZHJvcCBvZiBzb3VuZCBpbiAzRCB3b3JsZCBzcGFjZVxyXG4gICAgICovXHJcbiAgICB0eXBlIERJU1RBTkNFX01PREVMX1RZUEUgPSBcImxpbmVhclwiIHwgXCJpbnZlcnNlXCIgfCBcImV4cG9uZW50aWFsXCI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBbW0F1ZGlvTG9jYWxpc2F0aW9uXV0gZGVzY3JpYmVzIHRoZSBBdWRpbyBQYW5uZXIgdXNlZCBpbiBbW0NvbXBvbmVudEF1ZGlvXV0sIFxyXG4gICAgICogd2hpY2ggY29udGFpbnMgZGF0YSBmb3IgUG9zaXRpb24sIE9yaWVudGF0aW9uIGFuZCBvdGhlciBkYXRhIG5lZWRlZCB0byBsb2NhbGl6ZSB0aGUgQXVkaW8gaW4gYSAzRCBzcGFjZS5cclxuICAgICAqIEBhdXRob3JzIFRob21hcyBEb3JuZXIsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXVkaW9Mb2NhbGlzYXRpb24ge1xyXG5cclxuICAgICAgICBwdWJsaWMgcGFubmVyTm9kZTogUGFubmVyTm9kZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBwYW5uaW5nTW9kZWw6IFBBTk5JTkdfTU9ERUxfVFlQRTtcclxuICAgICAgICBwcml2YXRlIGRpc3RhbmNlTW9kZWw6IERJU1RBTkNFX01PREVMX1RZUEU7XHJcblxyXG4gICAgICAgIHByaXZhdGUgcmVmRGlzdGFuY2U6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIG1heERpc3RhbmNlOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSByb2xsb2ZmRmFjdG9yOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBjb25lSW5uZXJBbmdsZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgY29uZU91dGVyQW5nbGU6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGNvbmVPdXRlckdhaW46IG51bWJlcjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvbjogVmVjdG9yMztcclxuICAgICAgICBwcml2YXRlIG9yaWVudGF0aW9uOiBWZWN0b3IzO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnN0cnVjdG9yIGZvciB0aGUgW1tBdWRpb0xvY2FsaXNhdGlvbl1dIENsYXNzXHJcbiAgICAgICAgICogQHBhcmFtIF9hdWRpb0NvbnRleHQgZnJvbSBbW0F1ZGlvU2V0dGluZ3NdXVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzKSB7XHJcbiAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3JlYXRlUGFubmVyKCk7XHJcbiAgICAgICAgICAgdGhpcy5pbml0RGVmYXVsdFZhbHVlcygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZVBvc2l0aW9ucyhfcG9zaXRpb246IFZlY3RvcjMsIF9vcmllbnRhdGlvbjogVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnNldFBhbm5lclBvc2l0aW9uKF9wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0UGFubmVyT3JpZW50YXRpb24oX29yaWVudGF0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgIC8qKlxyXG4gICAgICAgICAqIFdlIHdpbGwgY2FsbCBzZXRQYW5uZXJQb3NpdGlvbiB3aGVuZXZlciB0aGVyZSBpcyBhIG5lZWQgdG8gY2hhbmdlIFBvc2l0aW9ucy5cclxuICAgICAgICAgKiBBbGwgdGhlIHBvc2l0aW9uIHZhbHVlcyBzaG91bGQgYmUgaWRlbnRpY2FsIHRvIHRoZSBjdXJyZW50IFBvc2l0aW9uIHRoaXMgaXMgYXR0YWNoZWQgdG8uXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiAgICAgIHwgICAgIFxyXG4gICAgICAgICAqICAgICAgby0tLVxyXG4gICAgICAgICAqICAgIC8gIF9fXHJcbiAgICAgICAgICogICAgICB8X3wgUG9zaXRpb25cclxuICAgICAgICAgKiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0UGFubmVyUG9zaXRpb24oX3Bvc2l0aW9uOiBWZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucG9zaXRpb25YLnZhbHVlID0gLXRoaXMucG9zaXRpb24ueDtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLnBvc2l0aW9uWS52YWx1ZSA9IC10aGlzLnBvc2l0aW9uLno7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5wb3NpdGlvbloudmFsdWUgPSB0aGlzLnBvc2l0aW9uLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0UGFubmVyUG9zaXRpb24oKTogVmVjdG9yMyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0IFBvc2l0aW9uIGZvciBvcmllbnRhdGlvbiB0YXJnZXRcclxuICAgICAgICAgKiBcclxuICAgICAgICAgKiAgICAgIHwgICAgIFxyXG4gICAgICAgICAqICAgICAgby0tLVxyXG4gICAgICAgICAqICAgIC8gIF9fXHJcbiAgICAgICAgICogICAgICB8X3xcclxuICAgICAgICAgKiAgICAgICAgXFxcclxuICAgICAgICAgKiAgICAgICBUYXJnZXRcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0UGFubmVyT3JpZW50YXRpb24oX29yaWVudGF0aW9uOiBWZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSBfb3JpZW50YXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUub3JpZW50YXRpb25YLnZhbHVlID0gdGhpcy5vcmllbnRhdGlvbi54O1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUub3JpZW50YXRpb25ZLnZhbHVlID0gLXRoaXMub3JpZW50YXRpb24uejtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLm9yaWVudGF0aW9uWi52YWx1ZSA9IHRoaXMub3JpZW50YXRpb24ueTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRQYW5uZXJPcmllbnRhdGlvbigpOiBWZWN0b3IzIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub3JpZW50YXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RGlzdGFuY2VNb2RlbChfZGlzdGFuY2VNb2RlbFR5cGU6IERJU1RBTkNFX01PREVMX1RZUEUpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5kaXN0YW5jZU1vZGVsID0gX2Rpc3RhbmNlTW9kZWxUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUuZGlzdGFuY2VNb2RlbCA9IHRoaXMuZGlzdGFuY2VNb2RlbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREaXN0YW5jZU1vZGVsKCk6IERJU1RBTkNFX01PREVMX1RZUEUge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kaXN0YW5jZU1vZGVsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFBhbm5pbmdNb2RlbChfcGFubmluZ01vZGVsVHlwZTogUEFOTklOR19NT0RFTF9UWVBFKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmluZ01vZGVsID0gX3Bhbm5pbmdNb2RlbFR5cGU7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5wYW5uaW5nTW9kZWwgPSB0aGlzLnBhbm5pbmdNb2RlbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRQYW5uaW5nTW9kZWwoKTogUEFOTklOR19NT0RFTF9UWVBFIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFubmluZ01vZGVsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFJlZkRpc3RhbmNlKF9yZWZEaXN0YW5jZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucmVmRGlzdGFuY2UgPSBfcmVmRGlzdGFuY2U7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5yZWZEaXN0YW5jZSA9IHRoaXMucmVmRGlzdGFuY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0UmVmRGlzdGFuY2UoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVmRGlzdGFuY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0TWF4RGlzdGFuY2UoX21heERpc3RhbmNlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5tYXhEaXN0YW5jZSA9IF9tYXhEaXN0YW5jZTtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLm1heERpc3RhbmNlID0gdGhpcy5tYXhEaXN0YW5jZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRNYXhEaXN0YW5jZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tYXhEaXN0YW5jZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRSb2xsb2ZmRmFjdG9yKF9yb2xsb2ZmRmFjdG9yOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5yb2xsb2ZmRmFjdG9yID0gX3JvbGxvZmZGYWN0b3I7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5yb2xsb2ZmRmFjdG9yID0gdGhpcy5yb2xsb2ZmRmFjdG9yO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFJvbGxvZmZGYWN0b3IoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucm9sbG9mZkZhY3RvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRDb25lSW5uZXJBbmdsZShfY29uZUlubmVyQW5nbGU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmVJbm5lckFuZ2xlID0gX2NvbmVJbm5lckFuZ2xlO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUuY29uZUlubmVyQW5nbGUgPSB0aGlzLmNvbmVJbm5lckFuZ2xlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldENvbmVJbm5lckFuZ2xlKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmVJbm5lckFuZ2xlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldENvbmVPdXRlckFuZ2xlKF9jb25lT3V0ZXJBbmdsZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZU91dGVyQW5nbGUgPSBfY29uZU91dGVyQW5nbGU7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5jb25lT3V0ZXJBbmdsZSA9IHRoaXMuY29uZU91dGVyQW5nbGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0Q29uZU91dGVyQW5nbGUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZU91dGVyQW5nbGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29uZU91dGVyR2FpbihfY29uZU91dGVyR2FpbjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZU91dGVyR2FpbiA9IF9jb25lT3V0ZXJHYWluO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUuY29uZU91dGVyR2FpbiA9IHRoaXMuY29uZU91dGVyR2FpbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRDb25lT3V0ZXJHYWluKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmVPdXRlckdhaW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTaG93IGFsbCBTZXR0aW5ncyBpbnNpZGUgb2YgW1tBdWRpb0xvY2FsaXNhdGlvbl1dLlxyXG4gICAgICAgICAqIFVzZSBmb3IgRGVidWdnaW5nIHB1cnBvc2VzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzaG93TG9jYWxpc2F0aW9uU2V0dGluZ3MoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXCIpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNob3cgYWxsIFNldHRpbmdzIG9mIFBhbm5lclwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGFubmVyIFBvc2l0aW9uOiBYOiBcIiArIHRoaXMucGFubmVyTm9kZS5wb3NpdGlvblgudmFsdWUgKyBcIiB8IFk6IFwiICsgdGhpcy5wYW5uZXJOb2RlLnBvc2l0aW9uWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLnBhbm5lck5vZGUucG9zaXRpb25aLnZhbHVlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQYW5uZXIgT3JpZW50YXRpb246IFg6IFwiICsgdGhpcy5wYW5uZXJOb2RlLm9yaWVudGF0aW9uWC52YWx1ZSArIFwiIHwgWTogXCIgKyB0aGlzLnBhbm5lck5vZGUub3JpZW50YXRpb25ZLnZhbHVlICsgXCIgfCBaOiBcIiArIHRoaXMucGFubmVyTm9kZS5vcmllbnRhdGlvbloudmFsdWUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkRpc3RhbmNlIE1vZGVsIFR5cGU6IFwiICsgdGhpcy5kaXN0YW5jZU1vZGVsKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQYW5uZXIgTW9kZWwgVHlwZTogXCIgKyB0aGlzLnBhbm5pbmdNb2RlbCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVmIERpc3RhbmNlOiBcIiArIHRoaXMucmVmRGlzdGFuY2UpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk1heCBEaXN0YW5jZTogXCIgKyB0aGlzLm1heERpc3RhbmNlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJSb2xsb2ZmIEZhY3RvcjogXCIgKyB0aGlzLnJvbGxvZmZGYWN0b3IpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbmUgSW5uZXIgQW5nbGU6IFwiICsgdGhpcy5jb25lSW5uZXJBbmdsZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29uZSBPdXRlciBBbmdsZTogXCIgKyB0aGlzLmNvbmVPdXRlckFuZ2xlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25lIE91dGVyIEdhaW46IFwiICsgdGhpcy5jb25lT3V0ZXJHYWluKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGluaXREZWZhdWx0VmFsdWVzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnNldFBhbm5pbmdNb2RlbChcIkhSVEZcIik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0RGlzdGFuY2VNb2RlbChcImludmVyc2VcIik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29uZUlubmVyQW5nbGUoOTApO1xyXG4gICAgICAgICAgICB0aGlzLnNldENvbmVPdXRlckFuZ2xlKDI3MCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29uZU91dGVyR2FpbigwKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRSZWZEaXN0YW5jZSgxKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRNYXhEaXN0YW5jZSg1KTtcclxuICAgICAgICAgICAgdGhpcy5zZXRSb2xsb2ZmRmFjdG9yKDEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zaG93TG9jYWxpc2F0aW9uU2V0dGluZ3MoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBFbnVtZXJhdG9yIGZvciBhbGwgcG9zc2libGUgT3NjaWxsYXRvciBUeXBlc1xyXG4gICAgICovXHJcbiAgICB0eXBlIE9TQ0lMTEFUT1JfVFlQRSA9IFwic2luZVwiIHwgXCJzcXVhcmVcIiB8IFwic2F3dG9vdGhcIiB8IFwidHJpYW5nbGVcIiB8IFwiY3VzdG9tXCI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbnRlcmZhY2UgdG8gY3JlYXRlIEN1c3RvbSBPc2NpbGxhdG9yIFR5cGVzLlxyXG4gICAgICogU3RhcnQtL0VuZHBvaW50IG9mIGEgY3VzdHVtIGN1cnZlIGUuZy4gc2luZSBjdXJ2ZS5cclxuICAgICAqIEJvdGggcGFyYW1ldGVycyBuZWVkIHRvIGJlIGluYmV0d2VlbiAtMSBhbmQgMS5cclxuICAgICAqIEBwYXJhbSBzdGFydHBvaW50IHN0YXJ0cG9pbnQgb2YgYSBjdXJ2ZSBcclxuICAgICAqIEBwYXJhbSBlbmRwb2ludCBFbmRwb2ludCBvZiBhIGN1cnZlIFxyXG4gICAgICovXHJcbiAgICBpbnRlcmZhY2UgT3NjaWxsYXRvcldhdmUge1xyXG4gICAgICAgIHN0YXJ0cG9pbnQ6IG51bWJlcjtcclxuICAgICAgICBlbmRwb2ludDogbnVtYmVyO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGQgYW4gW1tBdWRpb0ZpbHRlcl1dIHRvIGFuIFtbQXVkaW9dXVxyXG4gICAgICogQGF1dGhvcnMgVGhvbWFzIERvcm5lciwgSEZVLCAyMDE5XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBBdWRpb09zY2lsbGF0b3Ige1xyXG5cclxuICAgICAgICBwdWJsaWMgYXVkaW9Pc2NpbGxhdG9yOiBPc2NpbGxhdG9yTm9kZTsgXHJcblxyXG4gICAgICAgIHByaXZhdGUgZnJlcXVlbmN5OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBvc2NpbGxhdG9yVHlwZTogT1NDSUxMQVRPUl9UWVBFO1xyXG4gICAgICAgIHByaXZhdGUgb3NjaWxsYXRvcldhdmU6IFBlcmlvZGljV2F2ZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBsb2NhbEdhaW46IEdhaW5Ob2RlO1xyXG4gICAgICAgIHByaXZhdGUgbG9jYWxHYWluVmFsdWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9vc2NpbGxhdG9yVHlwZT86IE9TQ0lMTEFUT1JfVFlQRSkge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvT3NjaWxsYXRvciA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmNyZWF0ZU9zY2lsbGF0b3IoKTtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4gPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVHYWluKCk7XHJcbiAgICAgICAgICAgIHRoaXMub3NjaWxsYXRvclR5cGUgPSBfb3NjaWxsYXRvclR5cGU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9zY2lsbGF0b3JUeXBlICE9IFwiY3VzdG9tXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLnR5cGUgPSB0aGlzLm9zY2lsbGF0b3JUeXBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9zY2lsbGF0b3JXYXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdWRpb09zY2lsbGF0b3Iuc2V0UGVyaW9kaWNXYXZlKHRoaXMub3NjaWxsYXRvcldhdmUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGUgYSBDdXN0b20gUGVyaW9kaWMgV2F2ZSBmaXJzdCB0byB1c2UgQ3VzdG9tIFR5cGVcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRPc2NpbGxhdG9yVHlwZShfb3NjaWxsYXRvclR5cGU6IE9TQ0lMTEFUT1JfVFlQRSk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vc2NpbGxhdG9yVHlwZSAhPSBcImN1c3RvbVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvT3NjaWxsYXRvci50eXBlID0gdGhpcy5vc2NpbGxhdG9yVHlwZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vc2NpbGxhdG9yV2F2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLnNldFBlcmlvZGljV2F2ZSh0aGlzLm9zY2lsbGF0b3JXYXZlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldE9zY2lsbGF0b3JUeXBlKCk6IE9TQ0lMTEFUT1JfVFlQRSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9zY2lsbGF0b3JUeXBlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNyZWF0ZVBlcmlvZGljV2F2ZShfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX3JlYWw6IE9zY2lsbGF0b3JXYXZlLCBfaW1hZzogT3NjaWxsYXRvcldhdmUpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IHdhdmVSZWFsOiBGbG9hdDMyQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KDIpO1xyXG4gICAgICAgICAgICB3YXZlUmVhbFswXSA9IF9yZWFsLnN0YXJ0cG9pbnQ7XHJcbiAgICAgICAgICAgIHdhdmVSZWFsWzFdID0gX3JlYWwuZW5kcG9pbnQ7XHJcblxyXG4gICAgICAgICAgICBsZXQgd2F2ZUltYWc6IEZsb2F0MzJBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoMik7XHJcbiAgICAgICAgICAgIHdhdmVJbWFnWzBdID0gX2ltYWcuc3RhcnRwb2ludDtcclxuICAgICAgICAgICAgd2F2ZUltYWdbMV0gPSBfaW1hZy5lbmRwb2ludDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub3NjaWxsYXRvcldhdmUgPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVQZXJpb2RpY1dhdmUod2F2ZVJlYWwsIHdhdmVJbWFnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRMb2NhbEdhaW4oX2xvY2FsR2FpbjogR2Fpbk5vZGUpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4gPSBfbG9jYWxHYWluO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldExvY2FsR2FpbigpOiBHYWluTm9kZSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsR2FpbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRMb2NhbEdhaW5WYWx1ZShfbG9jYWxHYWluVmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmxvY2FsR2FpblZhbHVlID0gX2xvY2FsR2FpblZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLmxvY2FsR2Fpbi5nYWluLnZhbHVlID0gdGhpcy5sb2NhbEdhaW5WYWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRMb2NhbEdhaW5WYWx1ZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbEdhaW5WYWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRGcmVxdWVuY3koX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9mcmVxdWVuY3k6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmZyZXF1ZW5jeSA9IF9mcmVxdWVuY3k7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZSh0aGlzLmZyZXF1ZW5jeSwgX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3VycmVudFRpbWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEZyZXF1ZW5jeSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mcmVxdWVuY3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY3JlYXRlU25hcmUoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRPc2NpbGxhdG9yVHlwZShcInRyaWFuZ2xlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEZyZXF1ZW5jeShfYXVkaW9TZXR0aW5ncywgMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRMb2NhbEdhaW5WYWx1ZSgwKTtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLCBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAxLCBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSArIC4xKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLmNvbm5lY3QodGhpcy5sb2NhbEdhaW4pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBJbnRlcmZhY2UgdG8gZ2VuZXJhdGUgRGF0YSBQYWlycyBvZiBVUkwgYW5kIEF1ZGlvQnVmZmVyXHJcbiAgICAgKi9cclxuICAgIGludGVyZmFjZSBBdWRpb0RhdGEge1xyXG4gICAgICAgIHVybDogc3RyaW5nO1xyXG4gICAgICAgIGJ1ZmZlcjogQXVkaW9CdWZmZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZXNjcmliZXMgRGF0YSBIYW5kbGVyIGZvciBhbGwgQXVkaW8gU291cmNlc1xyXG4gICAgICogQGF1dGhvcnMgVGhvbWFzIERvcm5lciwgSEZVLCAyMDE5XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBBdWRpb1Nlc3Npb25EYXRhIHtcclxuXHJcbiAgICAgICAgcHVibGljIGRhdGFBcnJheTogQXVkaW9EYXRhW107XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnN0cnVjdG9yIG9mIHRoZSBbW0F1ZGlvU2Vzc2lvbkRhdGFdXSBDbGFzcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgdGhpcy5kYXRhQXJyYXkgPSBuZXcgQXJyYXkoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERlY29kaW5nIEF1ZGlvIERhdGEgXHJcbiAgICAgICAgICogQXN5bmNocm9ub3VzIEZ1bmN0aW9uIHRvIHBlcm1pdCB0aGUgbG9hZGluZyBvZiBtdWx0aXBsZSBEYXRhIFNvdXJjZXMgYXQgdGhlIHNhbWUgdGltZVxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9Db250ZXh0IEF1ZGlvQ29udGV4dCBmcm9tIEF1ZGlvU2V0dGluZ3NcclxuICAgICAgICAgKiBAcGFyYW0gX3VybCBVUkwgYXMgU3RyaW5nIGZvciBEYXRhIGZldGNoaW5nXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGFzeW5jIHVybFRvQnVmZmVyKF9hdWRpb0NvbnRleHQ6IEF1ZGlvQ29udGV4dCwgX3VybDogc3RyaW5nKTogUHJvbWlzZTxBdWRpb0J1ZmZlcj4ge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0IGluaXRPYmplY3Q6IFJlcXVlc3RJbml0ID0ge1xyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgbW9kZTogXCJzYW1lLW9yaWdpblwiLCAvL2RlZmF1bHQgLT4gc2FtZS1vcmlnaW5cclxuICAgICAgICAgICAgICAgIGNhY2hlOiBcIm5vLWNhY2hlXCIsIC8vZGVmYXVsdCAtPiBkZWZhdWx0IFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXVkaW8vbXBlZzNcIlxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHJlZGlyZWN0OiBcImZvbGxvd1wiIC8vIGRlZmF1bHQgLT4gZm9sbG93XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBsZXQgYnVmZmVyOiBBdWRpb0J1ZmZlciA9IG51bGw7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHg6IG51bWJlciA9IDA7IHggPCB0aGlzLmRhdGFBcnJheS5sZW5ndGg7IHgrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YUFycmF5W3hdLnVybCA9PSBfdXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFeGlzdGluZyBVUkwgZm91bmRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YUFycmF5W3hdLmJ1ZmZlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlOiBSZXNwb25zZSA9IGF3YWl0IHdpbmRvdy5mZXRjaChfdXJsLCBpbml0T2JqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyID0gYXdhaXQgcmVzcG9uc2UuYXJyYXlCdWZmZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZEF1ZGlvOiBBdWRpb0J1ZmZlciA9IGF3YWl0IF9hdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGFycmF5QnVmZmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoQnVmZmVySW5BcnJheShfdXJsLCBkZWNvZGVkQXVkaW8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlZEF1ZGlvO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gYXdhaXQgdGhpcy5kYXRhQXJyYXlbeF0uYnVmZmVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhQXJyYXlbeF0uYnVmZmVyO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYnVmZmVyID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVXJsSW5BcnJheShfdXJsKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZTogUmVzcG9uc2UgPSBhd2FpdCB3aW5kb3cuZmV0Y2goX3VybCwgaW5pdE9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyID0gYXdhaXQgcmVzcG9uc2UuYXJyYXlCdWZmZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkQXVkaW86IEF1ZGlvQnVmZmVyID0gYXdhaXQgX2F1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEoYXJyYXlCdWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEJ1ZmZlckluQXJyYXkoX3VybCwgZGVjb2RlZEF1ZGlvKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlZEF1ZGlvO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoX2Vycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dFcnJvckZldGNoKF9lcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBQdXNoIFVSTCBpbnRvIERhdGEgQXJyYXkgdG8gY3JlYXRlIGEgUGxhY2Vob2xkZXIgaW4gd2hpY2ggdGhlIEJ1ZmZlciBjYW4gYmUgcGxhY2VkIGF0IGEgbGF0ZXIgdGltZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFxyXG4gICAgICAgICAqIEBwYXJhbSBfdXJsIFxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9CdWZmZXIgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHB1c2hCdWZmZXJJbkFycmF5KF91cmw6IHN0cmluZywgX2F1ZGlvQnVmZmVyOiBBdWRpb0J1ZmZlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB4OiBudW1iZXIgPSAwOyB4IDwgdGhpcy5kYXRhQXJyYXkubGVuZ3RoOyB4KyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFBcnJheVt4XS51cmwgPT0gX3VybCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIgPSBfYXVkaW9CdWZmZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZSBhIG5ldyBsb2cgZm9yIHRoZSBEYXRhIEFycmF5LlxyXG4gICAgICAgICAqIFVzZXMgYSB1cmwgYW5kIGNyZWF0ZXMgYSBwbGFjZWhvbGRlciBmb3IgdGhlIEF1ZGlvQnVmZmVyLlxyXG4gICAgICAgICAqIFRoZSBBdWRpb0J1ZmZlciBnZXRzIGFkZGVkIGFzIHNvb24gYXMgaXQgaXMgY3JlYXRlZC5cclxuICAgICAgICAgKiBAcGFyYW0gX3VybCBBZGQgYSB1cmwgdG8gYSB3YW50ZWQgcmVzb3VyY2UgYXMgYSBzdHJpbmdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgcHVzaFVybEluQXJyYXkoX3VybDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBkYXRhOiBBdWRpb0RhdGE7XHJcbiAgICAgICAgICAgIGRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IF91cmwsXHJcbiAgICAgICAgICAgICAgICBidWZmZXI6IG51bGxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5kYXRhQXJyYXkucHVzaChkYXRhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNob3cgYWxsIERhdGEgaW4gQXJyYXkuXHJcbiAgICAgICAgICogVXNlIHRoaXMgZm9yIERlYnVnZ2luZyBwdXJwb3Nlcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2hvd0RhdGFJbkFycmF5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB4OiBudW1iZXIgPSAwOyB4IDwgdGhpcy5kYXRhQXJyYXkubGVuZ3RoOyB4KyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXJyYXkgRGF0YTogXCIgKyB0aGlzLmRhdGFBcnJheVt4XS51cmwgKyB0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFcnJvciBNZXNzYWdlIGZvciBEYXRhIEZldGNoaW5nXHJcbiAgICAgICAgICogQHBhcmFtIGUgRXJyb3JcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGxvZ0Vycm9yRmV0Y2goX2Vycm9yOiBFcnJvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvIGVycm9yXCIsIF9lcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIERlc2NyaWJlcyBHbG9iYWwgQXVkaW8gU2V0dGluZ3MuXHJcbiAgICAgKiBJcyBtZWFudCB0byBiZSB1c2VkIGFzIGEgTWVudSBvcHRpb24uXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF1ZGlvU2V0dGluZ3Mge1xyXG4gICAgICAgIFxyXG4gICAgICAgIHB1YmxpYyBtYXN0ZXJHYWluOiBHYWluTm9kZTtcclxuICAgICAgICBwcml2YXRlIG1hc3RlckdhaW5WYWx1ZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBwcml2YXRlIGdsb2JhbEF1ZGlvQ29udGV4dDogQXVkaW9Db250ZXh0O1xyXG4gICAgICAgIHByaXZhdGUgYXVkaW9TZXNzaW9uRGF0YTogQXVkaW9TZXNzaW9uRGF0YTtcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnN0cnVjdG9yIGZvciB0aGUgW1tBdWRpb1NldHRpbmdzXV0gQ2xhc3MuXHJcbiAgICAgICAgICogTWFpbiBjbGFzcyBmb3IgYWxsIEF1ZGlvIENsYXNzZXMuXHJcbiAgICAgICAgICogTmVlZCB0byBjcmVhdGUgdGhpcyBmaXJzdCwgd2hlbiB3b3JraW5nIHdpdGggc291bmRzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldEF1ZGlvQ29udGV4dChuZXcgQXVkaW9Db250ZXh0KHsgbGF0ZW5jeUhpbnQ6IFwiaW50ZXJhY3RpdmVcIiwgc2FtcGxlUmF0ZTogNDQxMDAgfSkpO1xyXG4gICAgICAgICAgICAvL3RoaXMuZ2xvYmFsQXVkaW9Db250ZXh0LnJlc3VtZSgpO1xyXG4gICAgICAgICAgICB0aGlzLm1hc3RlckdhaW4gPSB0aGlzLmdsb2JhbEF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWFzdGVyR2FpblZhbHVlKDEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRBdWRpb1Nlc3Npb24obmV3IEF1ZGlvU2Vzc2lvbkRhdGEoKSk7XHJcbiAgICAgICAgICAgIHRoaXMubWFzdGVyR2Fpbi5jb25uZWN0KHRoaXMuZ2xvYmFsQXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRNYXN0ZXJHYWluVmFsdWUoX21hc3RlckdhaW5WYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubWFzdGVyR2FpblZhbHVlID0gX21hc3RlckdhaW5WYWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5tYXN0ZXJHYWluLmdhaW4udmFsdWUgPSB0aGlzLm1hc3RlckdhaW5WYWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRNYXN0ZXJHYWluVmFsdWUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFzdGVyR2FpblZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEF1ZGlvQ29udGV4dCgpOiBBdWRpb0NvbnRleHQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0QXVkaW9Db250ZXh0KF9hdWRpb0NvbnRleHQ6IEF1ZGlvQ29udGV4dCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmdsb2JhbEF1ZGlvQ29udGV4dCA9IF9hdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0QXVkaW9TZXNzaW9uKCk6IEF1ZGlvU2Vzc2lvbkRhdGEge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb1Nlc3Npb25EYXRhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEF1ZGlvU2Vzc2lvbihfYXVkaW9TZXNzaW9uOiBBdWRpb1Nlc3Npb25EYXRhKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9TZXNzaW9uRGF0YSA9IF9hdWRpb1Nlc3Npb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBQYXVzZXMgdGhlIHByb2dyZXNzaW9uIG9mIHRpbWUgb2YgdGhlIEF1ZGlvQ29udGV4dC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3VzcGVuZEF1ZGlvQ29udGV4dCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQuc3VzcGVuZCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVzdW1lcyB0aGUgcHJvZ3Jlc3Npb24gb2YgdGltZSBvZiB0aGUgQXVkaW9Db250ZXh0IGFmdGVyIHBhdXNpbmcgaXQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHJlc3VtZUF1ZGlvQ29udGV4dCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQucmVzdW1lKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9Db2F0cy9Db2F0LnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIHR5cGUgQ29hdEluamVjdGlvbiA9ICh0aGlzOiBDb2F0LCBfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIpID0+IHZvaWQ7XHJcbiAgICBleHBvcnQgY2xhc3MgUmVuZGVySW5qZWN0b3Ige1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGNvYXRJbmplY3Rpb25zOiB7IFtjbGFzc05hbWU6IHN0cmluZ106IENvYXRJbmplY3Rpb24gfSA9IHtcclxuICAgICAgICAgICAgXCJDb2F0Q29sb3JlZFwiOiBSZW5kZXJJbmplY3Rvci5pbmplY3RSZW5kZXJEYXRhRm9yQ29hdENvbG9yZWQsXHJcbiAgICAgICAgICAgIFwiQ29hdFRleHR1cmVkXCI6IFJlbmRlckluamVjdG9yLmluamVjdFJlbmRlckRhdGFGb3JDb2F0VGV4dHVyZWQsXHJcbiAgICAgICAgICAgIFwiQ29hdE1hdENhcFwiOiBSZW5kZXJJbmplY3Rvci5pbmplY3RSZW5kZXJEYXRhRm9yQ29hdE1hdENhcFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZGVjb3JhdGVDb2F0KF9jb25zdHJ1Y3RvcjogRnVuY3Rpb24pOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGNvYXRJbmplY3Rpb246IENvYXRJbmplY3Rpb24gPSBSZW5kZXJJbmplY3Rvci5jb2F0SW5qZWN0aW9uc1tfY29uc3RydWN0b3IubmFtZV07XHJcbiAgICAgICAgICAgIGlmICghY29hdEluamVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoXCJObyBpbmplY3Rpb24gZGVjb3JhdG9yIGRlZmluZWQgZm9yIFwiICsgX2NvbnN0cnVjdG9yLm5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShfY29uc3RydWN0b3IucHJvdG90eXBlLCBcInVzZVJlbmRlckRhdGFcIiwge1xyXG4gICAgICAgICAgICAgICAgdmFsdWU6IGNvYXRJbmplY3Rpb25cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBpbmplY3RSZW5kZXJEYXRhRm9yQ29hdENvbG9yZWQodGhpczogQ29hdCwgX3JlbmRlclNoYWRlcjogUmVuZGVyU2hhZGVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBjb2xvclVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV9jb2xvclwiXTtcclxuICAgICAgICAgICAgLy8gbGV0IHsgciwgZywgYiwgYSB9ID0gKDxDb2F0Q29sb3JlZD50aGlzKS5jb2xvcjtcclxuICAgICAgICAgICAgLy8gbGV0IGNvbG9yOiBGbG9hdDMyQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KFtyLCBnLCBiLCBhXSk7XHJcbiAgICAgICAgICAgIGxldCBjb2xvcjogRmxvYXQzMkFycmF5ID0gKDxDb2F0Q29sb3JlZD50aGlzKS5jb2xvci5nZXRBcnJheSgpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5nZXRSZW5kZXJpbmdDb250ZXh0KCkudW5pZm9ybTRmdihjb2xvclVuaWZvcm1Mb2NhdGlvbiwgY29sb3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgaW5qZWN0UmVuZGVyRGF0YUZvckNvYXRUZXh0dXJlZCh0aGlzOiBDb2F0LCBfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGNyYzM6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQgPSBSZW5kZXJPcGVyYXRvci5nZXRSZW5kZXJpbmdDb250ZXh0KCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbmRlckRhdGEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGJ1ZmZlcnMgZXhpc3RcclxuICAgICAgICAgICAgICAgIGNyYzMuYWN0aXZlVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkUwKTtcclxuICAgICAgICAgICAgICAgIGNyYzMuYmluZFRleHR1cmUoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCB0aGlzLnJlbmRlckRhdGFbXCJ0ZXh0dXJlMFwiXSk7XHJcbiAgICAgICAgICAgICAgICBjcmMzLnVuaWZvcm0xaShfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV90ZXh0dXJlXCJdLCAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyRGF0YSA9IHt9O1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgaWYgYWxsIFdlYkdMLUNyZWF0aW9ucyBhcmUgYXNzZXJ0ZWRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHR1cmU6IFdlYkdMVGV4dHVyZSA9IFJlbmRlck1hbmFnZXIuYXNzZXJ0PFdlYkdMVGV4dHVyZT4oY3JjMy5jcmVhdGVUZXh0dXJlKCkpO1xyXG4gICAgICAgICAgICAgICAgY3JjMy5iaW5kVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIHRleHR1cmUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3JjMy50ZXhJbWFnZTJEKGNyYzMuVEVYVFVSRV8yRCwgMCwgY3JjMy5SR0JBLCBjcmMzLlJHQkEsIGNyYzMuVU5TSUdORURfQllURSwgKDxDb2F0VGV4dHVyZWQ+dGhpcykudGV4dHVyZS5pbWFnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY3JjMy50ZXhJbWFnZTJEKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIDAsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuUkdCQSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5SR0JBLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlVOU0lHTkVEX0JZVEUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8Q29hdFRleHR1cmVkPnRoaXMpLnRleHR1cmUuaW1hZ2VcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoX2Vycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoX2Vycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNyYzMudGV4UGFyYW1ldGVyaShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV9NQUdfRklMVEVSLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0Lk5FQVJFU1QpO1xyXG4gICAgICAgICAgICAgICAgY3JjMy50ZXhQYXJhbWV0ZXJpKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV8yRCwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFX01JTl9GSUxURVIsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuTkVBUkVTVCk7XHJcbiAgICAgICAgICAgICAgICBjcmMzLmdlbmVyYXRlTWlwbWFwKGNyYzMuVEVYVFVSRV8yRCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckRhdGFbXCJ0ZXh0dXJlMFwiXSA9IHRleHR1cmU7XHJcblxyXG4gICAgICAgICAgICAgICAgY3JjMy5iaW5kVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51c2VSZW5kZXJEYXRhKF9yZW5kZXJTaGFkZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBpbmplY3RSZW5kZXJEYXRhRm9yQ29hdE1hdENhcCh0aGlzOiBDb2F0LCBfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGNyYzM6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQgPSBSZW5kZXJPcGVyYXRvci5nZXRSZW5kZXJpbmdDb250ZXh0KCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgY29sb3JVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gX3JlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfdGludF9jb2xvclwiXTtcclxuICAgICAgICAgICAgbGV0IHsgciwgZywgYiwgYSB9ID0gKDxDb2F0TWF0Q2FwPnRoaXMpLnRpbnRDb2xvcjtcclxuICAgICAgICAgICAgbGV0IHRpbnRDb2xvckFycmF5OiBGbG9hdDMyQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KFtyLCBnLCBiLCBhXSk7XHJcbiAgICAgICAgICAgIGNyYzMudW5pZm9ybTRmdihjb2xvclVuaWZvcm1Mb2NhdGlvbiwgdGludENvbG9yQXJyYXkpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGZsb2F0VW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IF9yZW5kZXJTaGFkZXIudW5pZm9ybXNbXCJ1X2ZsYXRtaXhcIl07XHJcbiAgICAgICAgICAgIGxldCBmbGF0TWl4OiBudW1iZXIgPSAoPENvYXRNYXRDYXA+dGhpcykuZmxhdE1peDtcclxuICAgICAgICAgICAgY3JjMy51bmlmb3JtMWYoZmxvYXRVbmlmb3JtTG9jYXRpb24sIGZsYXRNaXgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMucmVuZGVyRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgLy8gYnVmZmVycyBleGlzdFxyXG4gICAgICAgICAgICAgICAgY3JjMy5hY3RpdmVUZXh0dXJlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRTApO1xyXG4gICAgICAgICAgICAgICAgY3JjMy5iaW5kVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIHRoaXMucmVuZGVyRGF0YVtcInRleHR1cmUwXCJdKTtcclxuICAgICAgICAgICAgICAgIGNyYzMudW5pZm9ybTFpKF9yZW5kZXJTaGFkZXIudW5pZm9ybXNbXCJ1X3RleHR1cmVcIl0sIDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJEYXRhID0ge307XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBpZiBhbGwgV2ViR0wtQ3JlYXRpb25zIGFyZSBhc3NlcnRlZFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dHVyZTogV2ViR0xUZXh0dXJlID0gUmVuZGVyTWFuYWdlci5hc3NlcnQ8V2ViR0xUZXh0dXJlPihjcmMzLmNyZWF0ZVRleHR1cmUoKSk7XHJcbiAgICAgICAgICAgICAgICBjcmMzLmJpbmRUZXh0dXJlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjcmMzLnRleEltYWdlMkQoY3JjMy5URVhUVVJFXzJELCAwLCBjcmMzLlJHQkEsIGNyYzMuUkdCQSwgY3JjMy5VTlNJR05FRF9CWVRFLCAoPENvYXRNYXRDYXA+dGhpcykudGV4dHVyZS5pbWFnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY3JjMy50ZXhJbWFnZTJEKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIDAsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuUkdCQSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5SR0JBLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlVOU0lHTkVEX0JZVEUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8Q29hdE1hdENhcD50aGlzKS50ZXh0dXJlLmltYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF9lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIERlYnVnLmVycm9yKF9lcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjcmMzLnRleFBhcmFtZXRlcmkoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfTUFHX0ZJTFRFUiwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5ORUFSRVNUKTtcclxuICAgICAgICAgICAgICAgIGNyYzMudGV4UGFyYW1ldGVyaShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV9NSU5fRklMVEVSLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0Lk5FQVJFU1QpO1xyXG4gICAgICAgICAgICAgICAgY3JjMy5nZW5lcmF0ZU1pcG1hcChjcmMzLlRFWFRVUkVfMkQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJEYXRhW1widGV4dHVyZTBcIl0gPSB0ZXh0dXJlO1xyXG5cclxuICAgICAgICAgICAgICAgIGNyYzMuYmluZFRleHR1cmUoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCBudWxsKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXNlUmVuZGVyRGF0YShfcmVuZGVyU2hhZGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBCdWZmZXJTcGVjaWZpY2F0aW9uIHtcclxuICAgICAgICBzaXplOiBudW1iZXI7ICAgLy8gVGhlIHNpemUgb2YgdGhlIGRhdGFzYW1wbGUuXHJcbiAgICAgICAgZGF0YVR5cGU6IG51bWJlcjsgLy8gVGhlIGRhdGF0eXBlIG9mIHRoZSBzYW1wbGUgKGUuZy4gZ2wuRkxPQVQsIGdsLkJZVEUsIGV0Yy4pXHJcbiAgICAgICAgbm9ybWFsaXplOiBib29sZWFuOyAvLyBGbGFnIHRvIG5vcm1hbGl6ZSB0aGUgZGF0YS5cclxuICAgICAgICBzdHJpZGU6IG51bWJlcjsgLy8gTnVtYmVyIG9mIGluZGljZXMgdGhhdCB3aWxsIGJlIHNraXBwZWQgZWFjaCBpdGVyYXRpb24uXHJcbiAgICAgICAgb2Zmc2V0OiBudW1iZXI7IC8vIEluZGV4IG9mIHRoZSBlbGVtZW50IHRvIGJlZ2luIHdpdGguXHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIFJlbmRlclNoYWRlciB7XHJcbiAgICAgICAgLy8gVE9ETzogZXhhbWluZSwgaWYgdGhpcyBzaG91bGQgYmUgaW5qZWN0ZWQgaW4gc2hhZGVyIGNsYXNzIHZpYSBSZW5kZXJJbmplY3RvciwgYXMgZG9uZSB3aXRoIENvYXRcclxuICAgICAgICBwcm9ncmFtOiBXZWJHTFByb2dyYW07XHJcbiAgICAgICAgYXR0cmlidXRlczogeyBbbmFtZTogc3RyaW5nXTogbnVtYmVyIH07XHJcbiAgICAgICAgdW5pZm9ybXM6IHsgW25hbWU6IHN0cmluZ106IFdlYkdMVW5pZm9ybUxvY2F0aW9uIH07XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBSZW5kZXJCdWZmZXJzIHtcclxuICAgICAgICAvLyBUT0RPOiBleGFtaW5lLCBpZiB0aGlzIHNob3VsZCBiZSBpbmplY3RlZCBpbiBtZXNoIGNsYXNzIHZpYSBSZW5kZXJJbmplY3RvciwgYXMgZG9uZSB3aXRoIENvYXRcclxuICAgICAgICB2ZXJ0aWNlczogV2ViR0xCdWZmZXI7XHJcbiAgICAgICAgaW5kaWNlczogV2ViR0xCdWZmZXI7XHJcbiAgICAgICAgbkluZGljZXM6IG51bWJlcjtcclxuICAgICAgICB0ZXh0dXJlVVZzOiBXZWJHTEJ1ZmZlcjtcclxuICAgICAgICBub3JtYWxzRmFjZTogV2ViR0xCdWZmZXI7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBSZW5kZXJDb2F0IHtcclxuICAgICAgICAvL1RPRE86IGV4YW1pbmUsIGlmIGl0IG1ha2VzIHNlbnNlIHRvIHN0b3JlIGEgdmFvIGZvciBlYWNoIENvYXQsIGV2ZW4gdGhvdWdoIGUuZy4gY29sb3Igd29uJ3QgYmUgc3RvcmVkIGFueXdheS4uLlxyXG4gICAgICAgIC8vdmFvOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0O1xyXG4gICAgICAgIGNvYXQ6IENvYXQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBSZW5kZXJMaWdodHMge1xyXG4gICAgICAgIFt0eXBlOiBzdHJpbmddOiBGbG9hdDMyQXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCYXNlIGNsYXNzIGZvciBSZW5kZXJNYW5hZ2VyLCBoYW5kbGluZyB0aGUgY29ubmVjdGlvbiB0byB0aGUgcmVuZGVyaW5nIHN5c3RlbSwgaW4gdGhpcyBjYXNlIFdlYkdMLlxyXG4gICAgICogTWV0aG9kcyBhbmQgYXR0cmlidXRlcyBvZiB0aGlzIGNsYXNzIHNob3VsZCBub3QgYmUgY2FsbGVkIGRpcmVjdGx5LCBvbmx5IHRocm91Z2ggW1tSZW5kZXJNYW5hZ2VyXV1cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlbmRlck9wZXJhdG9yIHtcclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGNyYzM6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQ7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgcmVjdFZpZXdwb3J0OiBSZWN0YW5nbGU7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgcmVuZGVyU2hhZGVyUmF5Q2FzdDogUmVuZGVyU2hhZGVyO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAqIENoZWNrcyB0aGUgZmlyc3QgcGFyYW1ldGVyIGFuZCB0aHJvd3MgYW4gZXhjZXB0aW9uIHdpdGggdGhlIFdlYkdMLWVycm9yY29kZSBpZiB0aGUgdmFsdWUgaXMgbnVsbFxyXG4gICAgICAgICogQHBhcmFtIF92YWx1ZSAvLyB2YWx1ZSB0byBjaGVjayBhZ2FpbnN0IG51bGxcclxuICAgICAgICAqIEBwYXJhbSBfbWVzc2FnZSAvLyBvcHRpb25hbCwgYWRkaXRpb25hbCBtZXNzYWdlIGZvciB0aGUgZXhjZXB0aW9uXHJcbiAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGFzc2VydDxUPihfdmFsdWU6IFQgfCBudWxsLCBfbWVzc2FnZTogc3RyaW5nID0gXCJcIik6IFQge1xyXG4gICAgICAgICAgICBpZiAoX3ZhbHVlID09PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb24gZmFpbGVkLiAke19tZXNzYWdlfSwgV2ViR0wtRXJyb3I6ICR7UmVuZGVyT3BlcmF0b3IuY3JjMyA/IFJlbmRlck9wZXJhdG9yLmNyYzMuZ2V0RXJyb3IoKSA6IFwiXCJ9YCk7XHJcbiAgICAgICAgICAgIHJldHVybiBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEluaXRpYWxpemVzIG9mZnNjcmVlbi1jYW52YXMsIHJlbmRlcmluZ2NvbnRleHQgYW5kIGhhcmR3YXJlIHZpZXdwb3J0LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgaW5pdGlhbGl6ZShfYW50aWFsaWFzOiBib29sZWFuID0gZmFsc2UsIF9hbHBoYTogYm9vbGVhbiA9IGZhbHNlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBjb250ZXh0QXR0cmlidXRlczogV2ViR0xDb250ZXh0QXR0cmlidXRlcyA9IHsgYWxwaGE6IF9hbHBoYSwgYW50aWFsaWFzOiBfYW50aWFsaWFzIH07XHJcbiAgICAgICAgICAgIGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTDJSZW5kZXJpbmdDb250ZXh0PihcclxuICAgICAgICAgICAgICAgIGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2wyXCIsIGNvbnRleHRBdHRyaWJ1dGVzKSxcclxuICAgICAgICAgICAgICAgIFwiV2ViR0wtY29udGV4dCBjb3VsZG4ndCBiZSBjcmVhdGVkXCJcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgLy8gRW5hYmxlIGJhY2tmYWNlLSBhbmQgekJ1ZmZlci1jdWxsaW5nLlxyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkNVTExfRkFDRSk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZW5hYmxlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuREVQVEhfVEVTVCk7XHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMucGl4ZWxTdG9yZWkoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5VTlBBQ0tfRkxJUF9ZX1dFQkdMLCB0cnVlKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IucmVjdFZpZXdwb3J0ID0gUmVuZGVyT3BlcmF0b3IuZ2V0Q2FudmFzUmVjdCgpO1xyXG5cclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IucmVuZGVyU2hhZGVyUmF5Q2FzdCA9IFJlbmRlck9wZXJhdG9yLmNyZWF0ZVByb2dyYW0oU2hhZGVyUmF5Q2FzdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm4gYSByZWZlcmVuY2UgdG8gdGhlIG9mZnNjcmVlbi1jYW52YXNcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldENhbnZhcygpOiBIVE1MQ2FudmFzRWxlbWVudCB7XHJcbiAgICAgICAgICAgIHJldHVybiA8SFRNTENhbnZhc0VsZW1lbnQ+UmVuZGVyT3BlcmF0b3IuY3JjMy5jYW52YXM7IC8vIFRPRE86IGVuYWJsZSBPZmZzY3JlZW5DYW52YXNcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0dXJuIGEgcmVmZXJlbmNlIHRvIHRoZSByZW5kZXJpbmcgY29udGV4dFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0UmVuZGVyaW5nQ29udGV4dCgpOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0IHtcclxuICAgICAgICAgICAgcmV0dXJuIFJlbmRlck9wZXJhdG9yLmNyYzM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybiBhIHJlY3RhbmdsZSBkZXNjcmliaW5nIHRoZSBzaXplIG9mIHRoZSBvZmZzY3JlZW4tY2FudmFzLiB4LHkgYXJlIDAgYXQgYWxsIHRpbWVzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0Q2FudmFzUmVjdCgpOiBSZWN0YW5nbGUge1xyXG4gICAgICAgICAgICBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IDxIVE1MQ2FudmFzRWxlbWVudD5SZW5kZXJPcGVyYXRvci5jcmMzLmNhbnZhcztcclxuICAgICAgICAgICAgcmV0dXJuIFJlY3RhbmdsZS5HRVQoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0IHRoZSBzaXplIG9mIHRoZSBvZmZzY3JlZW4tY2FudmFzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc2V0Q2FudmFzU2l6ZShfd2lkdGg6IG51bWJlciwgX2hlaWdodDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuY2FudmFzLndpZHRoID0gX3dpZHRoO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmNhbnZhcy5oZWlnaHQgPSBfaGVpZ2h0O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXQgdGhlIGFyZWEgb24gdGhlIG9mZnNjcmVlbi1jYW52YXMgdG8gcmVuZGVyIHRoZSBjYW1lcmEgaW1hZ2UgdG8uXHJcbiAgICAgICAgICogQHBhcmFtIF9yZWN0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBzZXRWaWV3cG9ydFJlY3RhbmdsZShfcmVjdDogUmVjdGFuZ2xlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oUmVuZGVyT3BlcmF0b3IucmVjdFZpZXdwb3J0LCBfcmVjdCk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudmlld3BvcnQoX3JlY3QueCwgX3JlY3QueSwgX3JlY3Qud2lkdGgsIF9yZWN0LmhlaWdodCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBhcmVhIG9uIHRoZSBvZmZzY3JlZW4tY2FudmFzIHRoZSBjYW1lcmEgaW1hZ2UgZ2V0cyByZW5kZXJlZCB0by5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldFZpZXdwb3J0UmVjdGFuZ2xlKCk6IFJlY3RhbmdsZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBSZW5kZXJPcGVyYXRvci5yZWN0Vmlld3BvcnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb252ZXJ0IGxpZ2h0IGRhdGEgdG8gZmxhdCBhcnJheXNcclxuICAgICAgICAgKiBUT0RPOiB0aGlzIG1ldGhvZCBhcHBlYXJzIHRvIGJlIG9ic29sZXRlLi4uP1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgY3JlYXRlUmVuZGVyTGlnaHRzKF9saWdodHM6IE1hcExpZ2h0VHlwZVRvTGlnaHRMaXN0KTogUmVuZGVyTGlnaHRzIHtcclxuICAgICAgICAgICAgbGV0IHJlbmRlckxpZ2h0czogUmVuZGVyTGlnaHRzID0ge307XHJcbiAgICAgICAgICAgIGZvciAobGV0IGVudHJ5IG9mIF9saWdodHMpIHtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHNpbXBseWZ5LCBzaW5jZSBkaXJlY3Rpb24gaXMgbm93IGhhbmRsZWQgYnkgQ29tcG9uZW50TGlnaHRcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZW50cnlbMF0pIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIExpZ2h0QW1iaWVudDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFtYmllbnQ6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGNtcExpZ2h0IG9mIGVudHJ5WzFdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYzogQ29sb3IgPSBjbXBMaWdodC5saWdodC5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFtYmllbnQucHVzaChjLnIsIGMuZywgYy5iLCBjLmEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpZ2h0c1tcInVfYW1iaWVudFwiXSA9IG5ldyBGbG9hdDMyQXJyYXkoYW1iaWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTGlnaHREaXJlY3Rpb25hbDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbmFsOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjbXBMaWdodCBvZiBlbnRyeVsxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGM6IENvbG9yID0gY21wTGlnaHQubGlnaHQuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgZDogVmVjdG9yMyA9ICg8TGlnaHREaXJlY3Rpb25hbD5saWdodC5nZXRMaWdodCgpKS5kaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb25hbC5wdXNoKGMuciwgYy5nLCBjLmIsIGMuYSwgMCwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlnaHRzW1widV9kaXJlY3Rpb25hbFwiXSA9IG5ldyBGbG9hdDMyQXJyYXkoZGlyZWN0aW9uYWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBEZWJ1Zy53YXJuKFwiU2hhZGVyc3RydWN0dXJlIHVuZGVmaW5lZCBmb3JcIiwgZW50cnlbMF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJMaWdodHM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXQgbGlnaHQgZGF0YSBpbiBzaGFkZXJzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBzZXRMaWdodHNJblNoYWRlcihfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIsIF9saWdodHM6IE1hcExpZ2h0VHlwZVRvTGlnaHRMaXN0KTogdm9pZCB7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLnVzZVByb2dyYW0oX3JlbmRlclNoYWRlcik7XHJcbiAgICAgICAgICAgIGxldCB1bmk6IHsgW25hbWU6IHN0cmluZ106IFdlYkdMVW5pZm9ybUxvY2F0aW9uIH0gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zO1xyXG5cclxuICAgICAgICAgICAgbGV0IGFtYmllbnQ6IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gdW5pW1widV9hbWJpZW50LmNvbG9yXCJdO1xyXG4gICAgICAgICAgICBpZiAoYW1iaWVudCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNtcExpZ2h0czogQ29tcG9uZW50TGlnaHRbXSA9IF9saWdodHMuZ2V0KExpZ2h0QW1iaWVudCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY21wTGlnaHRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogYWRkIHVwIGFtYmllbnQgbGlnaHRzIHRvIGEgc2luZ2xlIGNvbG9yXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdDogQ29sb3IgPSBuZXcgQ29sb3IoMCwgMCwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY21wTGlnaHQgb2YgY21wTGlnaHRzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuYWRkKGNtcExpZ2h0LmxpZ2h0LmNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLnVuaWZvcm00ZnYoYW1iaWVudCwgcmVzdWx0LmdldEFycmF5KCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgbkRpcmVjdGlvbmFsOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IHVuaVtcInVfbkxpZ2h0c0RpcmVjdGlvbmFsXCJdO1xyXG4gICAgICAgICAgICBpZiAobkRpcmVjdGlvbmFsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY21wTGlnaHRzOiBDb21wb25lbnRMaWdodFtdID0gX2xpZ2h0cy5nZXQoTGlnaHREaXJlY3Rpb25hbCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY21wTGlnaHRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG46IG51bWJlciA9IGNtcExpZ2h0cy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtMXVpKG5EaXJlY3Rpb25hbCwgbik7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY21wTGlnaHQ6IENvbXBvbmVudExpZ2h0ID0gY21wTGlnaHRzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLnVuaWZvcm00ZnYodW5pW2B1X2RpcmVjdGlvbmFsWyR7aX1dLmNvbG9yYF0sIGNtcExpZ2h0LmxpZ2h0LmNvbG9yLmdldEFycmF5KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBWZWN0b3IzID0gVmVjdG9yMy5aKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbi50cmFuc2Zvcm0oY21wTGlnaHQucGl2b3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24udHJhbnNmb3JtKGNtcExpZ2h0LmdldENvbnRhaW5lcigpLm10eFdvcmxkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtM2Z2KHVuaVtgdV9kaXJlY3Rpb25hbFske2l9XS5kaXJlY3Rpb25gXSwgZGlyZWN0aW9uLmdldCgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZGVidWdnZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBEcmF3IGEgbWVzaCBidWZmZXIgdXNpbmcgdGhlIGdpdmVuIGluZm9zIGFuZCB0aGUgY29tcGxldGUgcHJvamVjdGlvbiBtYXRyaXhcclxuICAgICAgICAgKiBAcGFyYW0gX3JlbmRlclNoYWRlciBcclxuICAgICAgICAgKiBAcGFyYW0gX3JlbmRlckJ1ZmZlcnMgXHJcbiAgICAgICAgICogQHBhcmFtIF9yZW5kZXJDb2F0IFxyXG4gICAgICAgICAqIEBwYXJhbSBfd29ybGQgXHJcbiAgICAgICAgICogQHBhcmFtIF9wcm9qZWN0aW9uIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgZHJhdyhfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIsIF9yZW5kZXJCdWZmZXJzOiBSZW5kZXJCdWZmZXJzLCBfcmVuZGVyQ29hdDogUmVuZGVyQ29hdCwgX3dvcmxkOiBNYXRyaXg0eDQsIF9wcm9qZWN0aW9uOiBNYXRyaXg0eDQpOiB2b2lkIHtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IudXNlUHJvZ3JhbShfcmVuZGVyU2hhZGVyKTtcclxuICAgICAgICAgICAgLy8gUmVuZGVyT3BlcmF0b3IudXNlQnVmZmVycyhfcmVuZGVyQnVmZmVycyk7XHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLnVzZVBhcmFtZXRlcihfcmVuZGVyQ29hdCk7XHJcblxyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIF9yZW5kZXJCdWZmZXJzLnZlcnRpY2VzKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShfcmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX3Bvc2l0aW9uXCJdKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3Iuc2V0QXR0cmlidXRlU3RydWN0dXJlKF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfcG9zaXRpb25cIl0sIE1lc2guZ2V0QnVmZmVyU3BlY2lmaWNhdGlvbigpKTtcclxuXHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBfcmVuZGVyQnVmZmVycy5pbmRpY2VzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfcmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX3RleHR1cmVVVnNcIl0pIHtcclxuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMudGV4dHVyZVVWcyk7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfdGV4dHVyZVVWc1wiXSk7IC8vIGVuYWJsZSB0aGUgYnVmZmVyXHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLnZlcnRleEF0dHJpYlBvaW50ZXIoX3JlbmRlclNoYWRlci5hdHRyaWJ1dGVzW1wiYV90ZXh0dXJlVVZzXCJdLCAyLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkZMT0FULCBmYWxzZSwgMCwgMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gU3VwcGx5IG1hdHJpeGRhdGEgdG8gc2hhZGVyLiBcclxuICAgICAgICAgICAgbGV0IHVQcm9qZWN0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IF9yZW5kZXJTaGFkZXIudW5pZm9ybXNbXCJ1X3Byb2plY3Rpb25cIl07XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudW5pZm9ybU1hdHJpeDRmdih1UHJvamVjdGlvbiwgZmFsc2UsIF9wcm9qZWN0aW9uLmdldCgpKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV93b3JsZFwiXSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHVXb3JsZDogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV93b3JsZFwiXTtcclxuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudW5pZm9ybU1hdHJpeDRmdih1V29ybGQsIGZhbHNlLCBfd29ybGQuZ2V0KCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMubm9ybWFsc0ZhY2UpO1xyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShfcmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX25vcm1hbFwiXSk7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5zZXRBdHRyaWJ1dGVTdHJ1Y3R1cmUoX3JlbmRlclNoYWRlci5hdHRyaWJ1dGVzW1wiYV9ub3JtYWxcIl0sIE1lc2guZ2V0QnVmZmVyU3BlY2lmaWNhdGlvbigpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGFsbCB0aGF0J3MgbGVmdCBvZiBjb2F0IGhhbmRsaW5nIGluIFJlbmRlck9wZXJhdG9yLCBkdWUgdG8gaW5qZWN0aW9uLiBTbyBleHRyYSByZWZlcmVuY2UgZnJvbSBub2RlIHRvIGNvYXQgaXMgdW5uZWNlc3NhcnlcclxuICAgICAgICAgICAgX3JlbmRlckNvYXQuY29hdC51c2VSZW5kZXJEYXRhKF9yZW5kZXJTaGFkZXIpO1xyXG5cclxuICAgICAgICAgICAgLy8gRHJhdyBjYWxsXHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuZHJhd0VsZW1lbnRzKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVFJJQU5HTEVTLCBNZXNoLmdldEJ1ZmZlclNwZWNpZmljYXRpb24oKS5vZmZzZXQsIF9yZW5kZXJCdWZmZXJzLm5JbmRpY2VzKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5kcmF3RWxlbWVudHMoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5UUklBTkdMRVMsIF9yZW5kZXJCdWZmZXJzLm5JbmRpY2VzLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlVOU0lHTkVEX1NIT1JULCAwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERyYXcgYSBidWZmZXIgd2l0aCBhIHNwZWNpYWwgc2hhZGVyIHRoYXQgdXNlcyBhbiBpZCBpbnN0ZWFkIG9mIGEgY29sb3JcclxuICAgICAgICAgKiBAcGFyYW0gX3JlbmRlclNoYWRlclxyXG4gICAgICAgICAqIEBwYXJhbSBfcmVuZGVyQnVmZmVycyBcclxuICAgICAgICAgKiBAcGFyYW0gX3dvcmxkIFxyXG4gICAgICAgICAqIEBwYXJhbSBfcHJvamVjdGlvbiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGRyYXdGb3JSYXlDYXN0KF9pZDogbnVtYmVyLCBfcmVuZGVyQnVmZmVyczogUmVuZGVyQnVmZmVycywgX3dvcmxkOiBNYXRyaXg0eDQsIF9wcm9qZWN0aW9uOiBNYXRyaXg0eDQpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IHJlbmRlclNoYWRlcjogUmVuZGVyU2hhZGVyID0gUmVuZGVyT3BlcmF0b3IucmVuZGVyU2hhZGVyUmF5Q2FzdDtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IudXNlUHJvZ3JhbShyZW5kZXJTaGFkZXIpO1xyXG5cclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBfcmVuZGVyQnVmZmVycy52ZXJ0aWNlcyk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX3Bvc2l0aW9uXCJdKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3Iuc2V0QXR0cmlidXRlU3RydWN0dXJlKHJlbmRlclNoYWRlci5hdHRyaWJ1dGVzW1wiYV9wb3NpdGlvblwiXSwgTWVzaC5nZXRCdWZmZXJTcGVjaWZpY2F0aW9uKCkpO1xyXG5cclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIF9yZW5kZXJCdWZmZXJzLmluZGljZXMpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3VwcGx5IG1hdHJpeGRhdGEgdG8gc2hhZGVyLiBcclxuICAgICAgICAgICAgbGV0IHVQcm9qZWN0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IHJlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfcHJvamVjdGlvblwiXTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtTWF0cml4NGZ2KHVQcm9qZWN0aW9uLCBmYWxzZSwgX3Byb2plY3Rpb24uZ2V0KCkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfd29ybGRcIl0pIHtcclxuICAgICAgICAgICAgICAgIGxldCB1V29ybGQ6IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV93b3JsZFwiXTtcclxuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudW5pZm9ybU1hdHJpeDRmdih1V29ybGQsIGZhbHNlLCBfd29ybGQuZ2V0KCkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgaWRVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV9pZFwiXTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuZ2V0UmVuZGVyaW5nQ29udGV4dCgpLnVuaWZvcm0xaShpZFVuaWZvcm1Mb2NhdGlvbiwgX2lkKTtcclxuXHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZHJhd0VsZW1lbnRzKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVFJJQU5HTEVTLCBfcmVuZGVyQnVmZmVycy5uSW5kaWNlcywgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5VTlNJR05FRF9TSE9SVCwgMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAjcmVnaW9uIFNoYWRlcnByb2dyYW0gXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBjcmVhdGVQcm9ncmFtKF9zaGFkZXJDbGFzczogdHlwZW9mIFNoYWRlcik6IFJlbmRlclNoYWRlciB7XHJcbiAgICAgICAgICAgIGxldCBjcmMzOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0ID0gUmVuZGVyT3BlcmF0b3IuY3JjMztcclxuICAgICAgICAgICAgbGV0IHByb2dyYW06IFdlYkdMUHJvZ3JhbSA9IGNyYzMuY3JlYXRlUHJvZ3JhbSgpO1xyXG4gICAgICAgICAgICBsZXQgcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXI7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjcmMzLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBSZW5kZXJPcGVyYXRvci5hc3NlcnQ8V2ViR0xTaGFkZXI+KGNvbXBpbGVTaGFkZXIoX3NoYWRlckNsYXNzLmdldFZlcnRleFNoYWRlclNvdXJjZSgpLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlZFUlRFWF9TSEFERVIpKSk7XHJcbiAgICAgICAgICAgICAgICBjcmMzLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBSZW5kZXJPcGVyYXRvci5hc3NlcnQ8V2ViR0xTaGFkZXI+KGNvbXBpbGVTaGFkZXIoX3NoYWRlckNsYXNzLmdldEZyYWdtZW50U2hhZGVyU291cmNlKCksIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRlJBR01FTlRfU0hBREVSKSkpO1xyXG4gICAgICAgICAgICAgICAgY3JjMy5saW5rUHJvZ3JhbShwcm9ncmFtKTtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcjogc3RyaW5nID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PHN0cmluZz4oY3JjMy5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBsaW5raW5nIFNoYWRlcjogXCIgKyBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZW5kZXJTaGFkZXIgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogcHJvZ3JhbSxcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiBkZXRlY3RBdHRyaWJ1dGVzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgdW5pZm9ybXM6IGRldGVjdFVuaWZvcm1zKClcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKF9lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoX2Vycm9yKTtcclxuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJTaGFkZXI7XHJcblxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY29tcGlsZVNoYWRlcihfc2hhZGVyQ29kZTogc3RyaW5nLCBfc2hhZGVyVHlwZTogR0xlbnVtKTogV2ViR0xTaGFkZXIgfCBudWxsIHtcclxuICAgICAgICAgICAgICAgIGxldCB3ZWJHTFNoYWRlcjogV2ViR0xTaGFkZXIgPSBjcmMzLmNyZWF0ZVNoYWRlcihfc2hhZGVyVHlwZSk7XHJcbiAgICAgICAgICAgICAgICBjcmMzLnNoYWRlclNvdXJjZSh3ZWJHTFNoYWRlciwgX3NoYWRlckNvZGUpO1xyXG4gICAgICAgICAgICAgICAgY3JjMy5jb21waWxlU2hhZGVyKHdlYkdMU2hhZGVyKTtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcjogc3RyaW5nID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PHN0cmluZz4oY3JjMy5nZXRTaGFkZXJJbmZvTG9nKHdlYkdMU2hhZGVyKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBjb21waWxpbmcgc2hhZGVyOiBcIiArIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBhbnkgY29tcGlsYXRpb24gZXJyb3JzLlxyXG4gICAgICAgICAgICAgICAgaWYgKCFjcmMzLmdldFNoYWRlclBhcmFtZXRlcih3ZWJHTFNoYWRlciwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5DT01QSUxFX1NUQVRVUykpIHtcclxuICAgICAgICAgICAgICAgICAgICBhbGVydChjcmMzLmdldFNoYWRlckluZm9Mb2cod2ViR0xTaGFkZXIpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB3ZWJHTFNoYWRlcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmdW5jdGlvbiBkZXRlY3RBdHRyaWJ1dGVzKCk6IHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9IHtcclxuICAgICAgICAgICAgICAgIGxldCBkZXRlY3RlZEF0dHJpYnV0ZXM6IHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9ID0ge307XHJcbiAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlQ291bnQ6IG51bWJlciA9IGNyYzMuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFDVElWRV9BVFRSSUJVVEVTKTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBhdHRyaWJ1dGVDb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZUluZm86IFdlYkdMQWN0aXZlSW5mbyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEFjdGl2ZUluZm8+KGNyYzMuZ2V0QWN0aXZlQXR0cmliKHByb2dyYW0sIGkpKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWF0dHJpYnV0ZUluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGRldGVjdGVkQXR0cmlidXRlc1thdHRyaWJ1dGVJbmZvLm5hbWVdID0gY3JjMy5nZXRBdHRyaWJMb2NhdGlvbihwcm9ncmFtLCBhdHRyaWJ1dGVJbmZvLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRldGVjdGVkQXR0cmlidXRlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmdW5jdGlvbiBkZXRlY3RVbmlmb3JtcygpOiB7IFtuYW1lOiBzdHJpbmddOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB9IHtcclxuICAgICAgICAgICAgICAgIGxldCBkZXRlY3RlZFVuaWZvcm1zOiB7IFtuYW1lOiBzdHJpbmddOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB9ID0ge307XHJcbiAgICAgICAgICAgICAgICBsZXQgdW5pZm9ybUNvdW50OiBudW1iZXIgPSBjcmMzLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BQ1RJVkVfVU5JRk9STVMpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHVuaWZvcm1Db3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZm86IFdlYkdMQWN0aXZlSW5mbyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEFjdGl2ZUluZm8+KGNyYzMuZ2V0QWN0aXZlVW5pZm9ybShwcm9ncmFtLCBpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBkZXRlY3RlZFVuaWZvcm1zW2luZm8ubmFtZV0gPSBSZW5kZXJPcGVyYXRvci5hc3NlcnQ8V2ViR0xVbmlmb3JtTG9jYXRpb24+KGNyYzMuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dyYW0sIGluZm8ubmFtZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRldGVjdGVkVW5pZm9ybXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyB1c2VQcm9ncmFtKF9zaGFkZXJJbmZvOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51c2VQcm9ncmFtKF9zaGFkZXJJbmZvLnByb2dyYW0pO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KF9zaGFkZXJJbmZvLmF0dHJpYnV0ZXNbXCJhX3Bvc2l0aW9uXCJdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBkZWxldGVQcm9ncmFtKF9wcm9ncmFtOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKF9wcm9ncmFtKSB7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmRlbGV0ZVByb2dyYW0oX3Byb2dyYW0ucHJvZ3JhbSk7XHJcbiAgICAgICAgICAgICAgICBkZWxldGUgX3Byb2dyYW0uYXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBfcHJvZ3JhbS51bmlmb3JtcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAjZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vICNyZWdpb24gTWVzaGJ1ZmZlclxyXG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgY3JlYXRlQnVmZmVycyhfbWVzaDogTWVzaCk6IFJlbmRlckJ1ZmZlcnMge1xyXG4gICAgICAgICAgICBsZXQgdmVydGljZXM6IFdlYkdMQnVmZmVyID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PFdlYkdMQnVmZmVyPihSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZUJ1ZmZlcigpKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCB2ZXJ0aWNlcyk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYnVmZmVyRGF0YShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX21lc2gudmVydGljZXMsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuU1RBVElDX0RSQVcpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGluZGljZXM6IFdlYkdMQnVmZmVyID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PFdlYkdMQnVmZmVyPihSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZUJ1ZmZlcigpKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIGluZGljZXMpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJ1ZmZlckRhdGEoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgX21lc2guaW5kaWNlcywgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5TVEFUSUNfRFJBVyk7XHJcblxyXG4gICAgICAgICAgICBsZXQgdGV4dHVyZVVWczogV2ViR0xCdWZmZXIgPSBSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIHRleHR1cmVVVnMpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJ1ZmZlckRhdGEoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIF9tZXNoLnRleHR1cmVVVnMsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuU1RBVElDX0RSQVcpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5vcm1hbHNGYWNlOiBXZWJHTEJ1ZmZlciA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEJ1ZmZlcj4oUmVuZGVyT3BlcmF0b3IuY3JjMy5jcmVhdGVCdWZmZXIoKSk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgbm9ybWFsc0ZhY2UpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJ1ZmZlckRhdGEoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIF9tZXNoLm5vcm1hbHNGYWNlLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlNUQVRJQ19EUkFXKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmZvOiBSZW5kZXJCdWZmZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgdmVydGljZXM6IHZlcnRpY2VzLFxyXG4gICAgICAgICAgICAgICAgaW5kaWNlczogaW5kaWNlcyxcclxuICAgICAgICAgICAgICAgIG5JbmRpY2VzOiBfbWVzaC5nZXRJbmRleENvdW50KCksXHJcbiAgICAgICAgICAgICAgICB0ZXh0dXJlVVZzOiB0ZXh0dXJlVVZzLFxyXG4gICAgICAgICAgICAgICAgbm9ybWFsc0ZhY2U6IG5vcm1hbHNGYWNlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBidWZmZXJJbmZvO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIHVzZUJ1ZmZlcnMoX3JlbmRlckJ1ZmZlcnM6IFJlbmRlckJ1ZmZlcnMpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY3VycmVudGx5IHVudXNlZCwgZG9uZSBzcGVjaWZpY2FsbHkgaW4gZHJhdy4gQ291bGQgYmUgc2F2ZWQgaW4gVkFPIHdpdGhpbiBSZW5kZXJCdWZmZXJzXHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMudmVydGljZXMpO1xyXG4gICAgICAgICAgICAvLyBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMuaW5kaWNlcyk7XHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMudGV4dHVyZVVWcyk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGRlbGV0ZUJ1ZmZlcnMoX3JlbmRlckJ1ZmZlcnM6IFJlbmRlckJ1ZmZlcnMpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKF9yZW5kZXJCdWZmZXJzKSB7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5kZWxldGVCdWZmZXIoX3JlbmRlckJ1ZmZlcnMudmVydGljZXMpO1xyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5kZWxldGVCdWZmZXIoX3JlbmRlckJ1ZmZlcnMudGV4dHVyZVVWcyk7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmRlbGV0ZUJ1ZmZlcihfcmVuZGVyQnVmZmVycy5pbmRpY2VzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAjZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vICNyZWdpb24gTWF0ZXJpYWxQYXJhbWV0ZXJzXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBjcmVhdGVQYXJhbWV0ZXIoX2NvYXQ6IENvYXQpOiBSZW5kZXJDb2F0IHtcclxuICAgICAgICAgICAgLy8gbGV0IHZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTFZlcnRleEFycmF5T2JqZWN0PihSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZVZlcnRleEFycmF5KCkpO1xyXG4gICAgICAgICAgICBsZXQgY29hdEluZm86IFJlbmRlckNvYXQgPSB7XHJcbiAgICAgICAgICAgICAgICAvL3ZhbzogbnVsbCxcclxuICAgICAgICAgICAgICAgIGNvYXQ6IF9jb2F0XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBjb2F0SW5mbztcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyB1c2VQYXJhbWV0ZXIoX2NvYXRJbmZvOiBSZW5kZXJDb2F0KTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZFZlcnRleEFycmF5KF9jb2F0SW5mby52YW8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGRlbGV0ZVBhcmFtZXRlcihfY29hdEluZm86IFJlbmRlckNvYXQpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKF9jb2F0SW5mbykge1xyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kVmVydGV4QXJyYXkobnVsbCk7XHJcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXJPcGVyYXRvci5jcmMzLmRlbGV0ZVZlcnRleEFycmF5KF9jb2F0SW5mby52YW8pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vICNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLyoqIFxyXG4gICAgICAgICAqIFdyYXBwZXIgZnVuY3Rpb24gdG8gdXRpbGl6ZSB0aGUgYnVmZmVyU3BlY2lmaWNhdGlvbiBpbnRlcmZhY2Ugd2hlbiBwYXNzaW5nIGRhdGEgdG8gdGhlIHNoYWRlciB2aWEgYSBidWZmZXIuXHJcbiAgICAgICAgICogQHBhcmFtIF9hdHRyaWJ1dGVMb2NhdGlvbiAvLyBUaGUgbG9jYXRpb24gb2YgdGhlIGF0dHJpYnV0ZSBvbiB0aGUgc2hhZGVyLCB0byB3aGljaCB0aGV5IGRhdGEgd2lsbCBiZSBwYXNzZWQuXHJcbiAgICAgICAgICogQHBhcmFtIF9idWZmZXJTcGVjaWZpY2F0aW9uIC8vIEludGVyZmFjZSBwYXNzaW5nIGRhdGFwdWxsc3BlY2lmaWNhdGlvbnMgdG8gdGhlIGJ1ZmZlci5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBzZXRBdHRyaWJ1dGVTdHJ1Y3R1cmUoX2F0dHJpYnV0ZUxvY2F0aW9uOiBudW1iZXIsIF9idWZmZXJTcGVjaWZpY2F0aW9uOiBCdWZmZXJTcGVjaWZpY2F0aW9uKTogdm9pZCB7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudmVydGV4QXR0cmliUG9pbnRlcihfYXR0cmlidXRlTG9jYXRpb24sIF9idWZmZXJTcGVjaWZpY2F0aW9uLnNpemUsIF9idWZmZXJTcGVjaWZpY2F0aW9uLmRhdGFUeXBlLCBfYnVmZmVyU3BlY2lmaWNhdGlvbi5ub3JtYWxpemUsIF9idWZmZXJTcGVjaWZpY2F0aW9uLnN0cmlkZSwgX2J1ZmZlclNwZWNpZmljYXRpb24ub2Zmc2V0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvTXV0YWJsZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1JlbmRlci9SZW5kZXJJbmplY3Rvci50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1JlbmRlci9SZW5kZXJPcGVyYXRvci50c1wiLz5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEhvbGRzIGRhdGEgdG8gZmVlZCBpbnRvIGEgW1tTaGFkZXJdXSB0byBkZXNjcmliZSB0aGUgc3VyZmFjZSBvZiBbW01lc2hdXS4gIFxyXG4gICAgICogW1tNYXRlcmlhbF1dcyByZWZlcmVuY2UgW1tDb2F0XV0gYW5kIFtbU2hhZGVyXV0uICAgXHJcbiAgICAgKiBUaGUgbWV0aG9kIHVzZVJlbmRlckRhdGEgd2lsbCBiZSBpbmplY3RlZCBieSBbW1JlbmRlckluamVjdG9yXV0gYXQgcnVudGltZSwgZXh0ZW5kaW5nIHRoZSBmdW5jdGlvbmFsaXR5IG9mIHRoaXMgY2xhc3MgdG8gZGVhbCB3aXRoIHRoZSByZW5kZXJlci5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvYXQgZXh0ZW5kcyBNdXRhYmxlIGltcGxlbWVudHMgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBwdWJsaWMgbmFtZTogc3RyaW5nID0gXCJDb2F0XCI7XHJcbiAgICAgICAgcHJvdGVjdGVkIHJlbmRlckRhdGE6IHtba2V5OiBzdHJpbmddOiB1bmtub3dufTtcclxuXHJcbiAgICAgICAgcHVibGljIG11dGF0ZShfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5tdXRhdGUoX211dGF0b3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVzZVJlbmRlckRhdGEoX3JlbmRlclNoYWRlcjogUmVuZGVyU2hhZGVyKTogdm9pZCB7LyogaW5qZWN0ZWQgYnkgUmVuZGVySW5qZWN0b3IqLyB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8jcmVnaW9uIFRyYW5zZmVyXHJcbiAgICAgICAgcHVibGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB0aGlzLmdldE11dGF0b3IoKTsgXHJcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICAgICAgICB0aGlzLm11dGF0ZShfc2VyaWFsaXphdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoKTogdm9pZCB7IC8qKi8gfVxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHNpbXBsZXN0IFtbQ29hdF1dIHByb3ZpZGluZyBqdXN0IGEgY29sb3JcclxuICAgICAqL1xyXG4gICAgQFJlbmRlckluamVjdG9yLmRlY29yYXRlQ29hdFxyXG4gICAgZXhwb3J0IGNsYXNzIENvYXRDb2xvcmVkIGV4dGVuZHMgQ29hdCB7XHJcbiAgICAgICAgcHVibGljIGNvbG9yOiBDb2xvcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2NvbG9yPzogQ29sb3IpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IF9jb2xvciB8fCBuZXcgQ29sb3IoMC41LCAwLjUsIDAuNSwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQSBbW0NvYXRdXSBwcm92aWRpbmcgYSB0ZXh0dXJlIGFuZCBhZGRpdGlvbmFsIGRhdGEgZm9yIHRleHR1cmluZ1xyXG4gICAgICovXHJcbiAgICBAUmVuZGVySW5qZWN0b3IuZGVjb3JhdGVDb2F0XHJcbiAgICBleHBvcnQgY2xhc3MgQ29hdFRleHR1cmVkIGV4dGVuZHMgQ29hdCB7XHJcbiAgICAgICAgcHVibGljIHRleHR1cmU6IFRleHR1cmVJbWFnZSA9IG51bGw7XHJcbiAgICAgICAgLy8ganVzdCBpZGVhcyBzbyBmYXJcclxuICAgICAgICBwdWJsaWMgdGlsaW5nWDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyB0aWxpbmdZOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIHJlcGV0aXRpb246IGJvb2xlYW47XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIEEgW1tDb2F0XV0gdG8gYmUgdXNlZCBieSB0aGUgTWF0Q2FwIFNoYWRlciBwcm92aWRpbmcgYSB0ZXh0dXJlLCBhIHRpbnQgY29sb3IgKDAuNSBncmV5IGlzIG5ldXRyYWwpXHJcbiAgICAgKiBhbmQgYSBmbGF0TWl4IG51bWJlciBmb3IgbWl4aW5nIGJldHdlZW4gc21vb3RoIGFuZCBmbGF0IHNoYWRpbmcuXHJcbiAgICAgKi9cclxuICAgIEBSZW5kZXJJbmplY3Rvci5kZWNvcmF0ZUNvYXRcclxuICAgIGV4cG9ydCBjbGFzcyBDb2F0TWF0Q2FwIGV4dGVuZHMgQ29hdCB7XHJcbiAgICAgICAgcHVibGljIHRleHR1cmU6IFRleHR1cmVJbWFnZSA9IG51bGw7XHJcbiAgICAgICAgcHVibGljIHRpbnRDb2xvcjogQ29sb3IgPSBuZXcgQ29sb3IoMC41LCAwLjUsIDAuNSwgMSk7XHJcbiAgICAgICAgcHVibGljIGZsYXRNaXg6IG51bWJlciA9IDAuNTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3RleHR1cmU/OiBUZXh0dXJlSW1hZ2UsIF90aW50Y29sb3I/OiBDb2xvciwgX2ZsYXRtaXg/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlID0gX3RleHR1cmUgfHwgbmV3IFRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnRpbnRDb2xvciA9IF90aW50Y29sb3IgfHwgbmV3IENvbG9yKDAuNSwgMC41LCAwLjUsIDEpO1xyXG4gICAgICAgICAgICB0aGlzLmZsYXRNaXggPSBfZmxhdG1peCA+IDEuMCA/IHRoaXMuZmxhdE1peCA9IDEuMCA6IHRoaXMuZmxhdE1peCA9IF9mbGF0bWl4IHx8IDAuNTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvU2VyaWFsaXplci50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL011dGFibGUudHNcIi8+XHJcbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqIFxyXG4gICAgICogU3VwZXJjbGFzcyBmb3IgYWxsIFtbQ29tcG9uZW50XV1zIHRoYXQgY2FuIGJlIGF0dGFjaGVkIHRvIFtbTm9kZV1dcy5cclxuICAgICAqIEBhdXRob3JzIEphc2NoYSBLYXJhZ8O2bCwgSEZVLCAyMDE5IHwgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbXBvbmVudCBleHRlbmRzIE11dGFibGUgaW1wbGVtZW50cyBTZXJpYWxpemFibGUge1xyXG4gICAgICAgIHByb3RlY3RlZCBzaW5nbGV0b246IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIHByaXZhdGUgY29udGFpbmVyOiBOb2RlIHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSBhY3RpdmU6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgICAgICBwdWJsaWMgYWN0aXZhdGUoX29uOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gX29uO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KF9vbiA/IEVWRU5ULkNPTVBPTkVOVF9BQ1RJVkFURSA6IEVWRU5ULkNPTVBPTkVOVF9ERUFDVElWQVRFKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBnZXQgaXNBY3RpdmUoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFjdGl2ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIElzIHRydWUsIHdoZW4gb25seSBvbmUgaW5zdGFuY2Ugb2YgdGhlIGNvbXBvbmVudCBjbGFzcyBjYW4gYmUgYXR0YWNoZWQgdG8gYSBub2RlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldCBpc1NpbmdsZXRvbigpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2luZ2xldG9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXRyaWV2ZXMgdGhlIG5vZGUsIHRoaXMgY29tcG9uZW50IGlzIGN1cnJlbnRseSBhdHRhY2hlZCB0b1xyXG4gICAgICAgICAqIEByZXR1cm5zIFRoZSBjb250YWluZXIgbm9kZSBvciBudWxsLCBpZiB0aGUgY29tcG9uZW50IGlzIG5vdCBhdHRhY2hlZCB0b1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBnZXRDb250YWluZXIoKTogTm9kZSB8IG51bGwge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250YWluZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRyaWVzIHRvIGFkZCB0aGUgY29tcG9uZW50IHRvIHRoZSBnaXZlbiBub2RlLCByZW1vdmluZyBpdCBmcm9tIHRoZSBwcmV2aW91cyBjb250YWluZXIgaWYgYXBwbGljYWJsZVxyXG4gICAgICAgICAqIEBwYXJhbSBfY29udGFpbmVyIFRoZSBub2RlIHRvIGF0dGFjaCB0aGlzIGNvbXBvbmVudCB0b1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzZXRDb250YWluZXIoX2NvbnRhaW5lcjogTm9kZSB8IG51bGwpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGFpbmVyID09IF9jb250YWluZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIGxldCBwcmV2aW91c0NvbnRhaW5lcjogTm9kZSA9IHRoaXMuY29udGFpbmVyO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzQ29udGFpbmVyKVxyXG4gICAgICAgICAgICAgICAgICAgIHByZXZpb3VzQ29udGFpbmVyLnJlbW92ZUNvbXBvbmVudCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29udGFpbmVyID0gX2NvbnRhaW5lcjtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbnRhaW5lcilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRDb21wb25lbnQodGhpcyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goX2Vycm9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lciA9IHByZXZpb3VzQ29udGFpbmVyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxyXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XHJcbiAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgYWN0aXZlOiB0aGlzLmFjdGl2ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmUgPSBfc2VyaWFsaXphdGlvbi5hY3RpdmU7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgICAgICAgZGVsZXRlIF9tdXRhdG9yLnNpbmdsZXRvbjtcclxuICAgICAgICAgICAgZGVsZXRlIF9tdXRhdG9yLmNvbnRhaW5lcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcbiAgICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29tcG9uZW50LnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAvKipcclxuICAgKiBIb2xkcyBkaWZmZXJlbnQgcGxheW1vZGVzIHRoZSBhbmltYXRpb24gdXNlcyB0byBwbGF5IGJhY2sgaXRzIGFuaW1hdGlvbi5cclxuICAgKiBAYXV0aG9yIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XHJcbiAgICovXHJcbiAgZXhwb3J0IGVudW0gQU5JTUFUSU9OX1BMQVlNT0RFIHtcclxuICAgIC8qKlBsYXlzIGFuaW1hdGlvbiBpbiBhIGxvb3A6IGl0IHJlc3RhcnRzIG9uY2UgaXQgaGl0IHRoZSBlbmQuKi9cclxuICAgIExPT1AsXHJcbiAgICAvKipQbGF5cyBhbmltYXRpb24gb25jZSBhbmQgc3RvcHMgYXQgdGhlIGxhc3Qga2V5L2ZyYW1lKi9cclxuICAgIFBMQVlPTkNFLFxyXG4gICAgLyoqUGxheXMgYW5pbWF0aW9uIG9uY2UgYW5kIHN0b3BzIG9uIHRoZSBmaXJzdCBrZXkvZnJhbWUgKi9cclxuICAgIFBMQVlPTkNFU1RPUEFGVEVSLFxyXG4gICAgLyoqUGxheXMgYW5pbWF0aW9uIGxpa2UgTE9PUCwgYnV0IGJhY2t3YXJkcy4qL1xyXG4gICAgUkVWRVJTRUxPT1AsXHJcbiAgICAvKipDYXVzZXMgdGhlIGFuaW1hdGlvbiBub3QgdG8gcGxheSBhdCBhbGwuIFVzZWZ1bCBmb3IganVtcGluZyB0byB2YXJpb3VzIHBvc2l0aW9ucyBpbiB0aGUgYW5pbWF0aW9uIHdpdGhvdXQgcHJvY2VlZGluZyBpbiB0aGUgYW5pbWF0aW9uLiovXHJcbiAgICBTVE9QXHJcbiAgICAvL1RPRE86IGFkZCBhbiBJTkhFUklUIGFuZCBhIFBJTkdQT05HIG1vZGVcclxuICB9XHJcblxyXG4gIGV4cG9ydCBlbnVtIEFOSU1BVElPTl9QTEFZQkFDSyB7XHJcbiAgICAvL1RPRE86IGFkZCBhbiBpbi1kZXB0aCBkZXNjcmlwdGlvbiBvZiB3aGF0IGhhcHBlbnMgdG8gdGhlIGFuaW1hdGlvbiAoYW5kIGV2ZW50cykgZGVwZW5kaW5nIG9uIHRoZSBQbGF5YmFjay4gVXNlIEdyYXBocyB0byBleHBsYWluLlxyXG4gICAgLyoqQ2FsY3VsYXRlcyB0aGUgc3RhdGUgb2YgdGhlIGFuaW1hdGlvbiBhdCB0aGUgZXhhY3QgcG9zaXRpb24gb2YgdGltZS4gSWdub3JlcyBGUFMgdmFsdWUgb2YgYW5pbWF0aW9uLiovXHJcbiAgICBUSU1FQkFTRURfQ09OVElOT1VTLFxyXG4gICAgLyoqTGltaXRzIHRoZSBjYWxjdWxhdGlvbiBvZiB0aGUgc3RhdGUgb2YgdGhlIGFuaW1hdGlvbiB0byB0aGUgRlBTIHZhbHVlIG9mIHRoZSBhbmltYXRpb24uIFNraXBzIGZyYW1lcyBpZiBuZWVkZWQuKi9cclxuICAgIFRJTUVCQVNFRF9SQVNURVJFRF9UT19GUFMsXHJcbiAgICAvKipVc2VzIHRoZSBGUFMgdmFsdWUgb2YgdGhlIGFuaW1hdGlvbiB0byBhZHZhbmNlIG9uY2UgcGVyIGZyYW1lLCBubyBtYXR0ZXIgdGhlIHNwZWVkIG9mIHRoZSBmcmFtZXMuIERvZXNuJ3Qgc2tpcCBhbnkgZnJhbWVzLiovXHJcbiAgICBGUkFNRUJBU0VEXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIb2xkcyBhIHJlZmVyZW5jZSB0byBhbiBbW0FuaW1hdGlvbl1dIGFuZCBjb250cm9scyBpdC4gQ29udHJvbHMgcGxheWJhY2sgYW5kIHBsYXltb2RlIGFzIHdlbGwgYXMgc3BlZWQuXHJcbiAgICogQGF1dGhvcnMgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcclxuICAgKi9cclxuICBleHBvcnQgY2xhc3MgQ29tcG9uZW50QW5pbWF0b3IgZXh0ZW5kcyBDb21wb25lbnQge1xyXG4gICAgLy9UT0RPOiBhZGQgZnVuY3Rpb25hbGl0eSB0byBibGVuZCBmcm9tIG9uZSBhbmltYXRpb24gdG8gYW5vdGhlci5cclxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uO1xyXG4gICAgcGxheW1vZGU6IEFOSU1BVElPTl9QTEFZTU9ERTtcclxuICAgIHBsYXliYWNrOiBBTklNQVRJT05fUExBWUJBQ0s7XHJcbiAgICBzcGVlZFNjYWxlc1dpdGhHbG9iYWxTcGVlZDogYm9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgcHJpdmF0ZSBsb2NhbFRpbWU6IFRpbWU7XHJcbiAgICBwcml2YXRlIHNwZWVkU2NhbGU6IG51bWJlciA9IDE7XHJcbiAgICBwcml2YXRlIGxhc3RUaW1lOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKF9hbmltYXRpb246IEFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb24oXCJcIiksIF9wbGF5bW9kZTogQU5JTUFUSU9OX1BMQVlNT0RFID0gQU5JTUFUSU9OX1BMQVlNT0RFLkxPT1AsIF9wbGF5YmFjazogQU5JTUFUSU9OX1BMQVlCQUNLID0gQU5JTUFUSU9OX1BMQVlCQUNLLlRJTUVCQVNFRF9DT05USU5PVVMpIHtcclxuICAgICAgc3VwZXIoKTtcclxuICAgICAgdGhpcy5hbmltYXRpb24gPSBfYW5pbWF0aW9uO1xyXG4gICAgICB0aGlzLnBsYXltb2RlID0gX3BsYXltb2RlO1xyXG4gICAgICB0aGlzLnBsYXliYWNrID0gX3BsYXliYWNrO1xyXG5cclxuICAgICAgdGhpcy5sb2NhbFRpbWUgPSBuZXcgVGltZSgpO1xyXG5cclxuICAgICAgLy9UT0RPOiB1cGRhdGUgYW5pbWF0aW9uIHRvdGFsIHRpbWUgd2hlbiBsb2FkaW5nIGEgZGlmZmVyZW50IGFuaW1hdGlvbj9cclxuICAgICAgdGhpcy5hbmltYXRpb24uY2FsY3VsYXRlVG90YWxUaW1lKCk7XHJcblxyXG4gICAgICBMb29wLmFkZEV2ZW50TGlzdGVuZXIoRVZFTlQuTE9PUF9GUkFNRSwgdGhpcy51cGRhdGVBbmltYXRpb25Mb29wLmJpbmQodGhpcykpO1xyXG4gICAgICBUaW1lLmdhbWUuYWRkRXZlbnRMaXN0ZW5lcihFVkVOVC5USU1FX1NDQUxFRCwgdGhpcy51cGRhdGVTY2FsZS5iaW5kKHRoaXMpKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgc3BlZWQoX3M6IG51bWJlcikge1xyXG4gICAgICB0aGlzLnNwZWVkU2NhbGUgPSBfcztcclxuICAgICAgdGhpcy51cGRhdGVTY2FsZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSnVtcHMgdG8gYSBjZXJ0YWluIHRpbWUgaW4gdGhlIGFuaW1hdGlvbiB0byBwbGF5IGZyb20gdGhlcmUuXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgVGhlIHRpbWUgdG8ganVtcCB0b1xyXG4gICAgICovXHJcbiAgICBqdW1wVG8oX3RpbWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICB0aGlzLmxvY2FsVGltZS5zZXQoX3RpbWUpO1xyXG4gICAgICB0aGlzLmxhc3RUaW1lID0gX3RpbWU7XHJcbiAgICAgIF90aW1lID0gX3RpbWUgJSB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWU7XHJcbiAgICAgIGxldCBtdXRhdG9yOiBNdXRhdG9yID0gdGhpcy5hbmltYXRpb24uZ2V0TXV0YXRlZChfdGltZSwgdGhpcy5jYWxjdWxhdGVEaXJlY3Rpb24oX3RpbWUpLCB0aGlzLnBsYXliYWNrKTtcclxuICAgICAgdGhpcy5nZXRDb250YWluZXIoKS5hcHBseUFuaW1hdGlvbihtdXRhdG9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgdGltZSBvZiB0aGUgYW5pbWF0aW9uLCBtb2R1bGF0ZWQgZm9yIGFuaW1hdGlvbiBsZW5ndGguXHJcbiAgICAgKi9cclxuICAgIGdldEN1cnJlbnRUaW1lKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLmxvY2FsVGltZS5nZXQoKSAlIHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZvcmNlcyBhbiB1cGRhdGUgb2YgdGhlIGFuaW1hdGlvbiBmcm9tIG91dHNpZGUuIFVzZWQgaW4gdGhlIFZpZXdBbmltYXRpb24uIFNob3VsZG4ndCBiZSB1c2VkIGR1cmluZyB0aGUgZ2FtZS5cclxuICAgICAqIEBwYXJhbSBfdGltZSB0aGUgKHVuc2NhbGVkKSB0aW1lIHRvIHVwZGF0ZSB0aGUgYW5pbWF0aW9uIHdpdGguXHJcbiAgICAgKiBAcmV0dXJucyBhIFR1cGVsIGNvbnRhaW5pbmcgdGhlIE11dGF0b3IgZm9yIEFuaW1hdGlvbiBhbmQgdGhlIHBsYXltb2RlIGNvcnJlY3RlZCB0aW1lLiBcclxuICAgICAqL1xyXG4gICAgdXBkYXRlQW5pbWF0aW9uKF90aW1lOiBudW1iZXIpOiBbTXV0YXRvciwgbnVtYmVyXSB7XHJcbiAgICAgIHJldHVybiB0aGlzLnVwZGF0ZUFuaW1hdGlvbkxvb3AobnVsbCwgX3RpbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vI3JlZ2lvbiB0cmFuc2ZlclxyXG4gICAgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xyXG4gICAgICBsZXQgczogU2VyaWFsaXphdGlvbiA9IHN1cGVyLnNlcmlhbGl6ZSgpO1xyXG4gICAgICBzW1wiYW5pbWF0aW9uXCJdID0gdGhpcy5hbmltYXRpb24uc2VyaWFsaXplKCk7XHJcbiAgICAgIHNbXCJwbGF5bW9kZVwiXSA9IHRoaXMucGxheW1vZGU7XHJcbiAgICAgIHNbXCJwbGF5YmFja1wiXSA9IHRoaXMucGxheWJhY2s7XHJcbiAgICAgIHNbXCJzcGVlZFNjYWxlXCJdID0gdGhpcy5zcGVlZFNjYWxlO1xyXG4gICAgICBzW1wic3BlZWRTY2FsZXNXaXRoR2xvYmFsU3BlZWRcIl0gPSB0aGlzLnNwZWVkU2NhbGVzV2l0aEdsb2JhbFNwZWVkO1xyXG5cclxuICAgICAgc1tzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSA9IHN1cGVyLnNlcmlhbGl6ZSgpO1xyXG5cclxuICAgICAgcmV0dXJuIHM7XHJcbiAgICB9XHJcblxyXG4gICAgZGVzZXJpYWxpemUoX3M6IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICB0aGlzLmFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb24oXCJcIik7XHJcbiAgICAgIHRoaXMuYW5pbWF0aW9uLmRlc2VyaWFsaXplKF9zLmFuaW1hdGlvbik7XHJcbiAgICAgIHRoaXMucGxheWJhY2sgPSBfcy5wbGF5YmFjaztcclxuICAgICAgdGhpcy5wbGF5bW9kZSA9IF9zLnBsYXltb2RlO1xyXG4gICAgICB0aGlzLnNwZWVkU2NhbGUgPSBfcy5zcGVlZFNjYWxlO1xyXG4gICAgICB0aGlzLnNwZWVkU2NhbGVzV2l0aEdsb2JhbFNwZWVkID0gX3Muc3BlZWRTY2FsZXNXaXRoR2xvYmFsU3BlZWQ7XHJcblxyXG4gICAgICBzdXBlci5kZXNlcmlhbGl6ZShfc1tzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIHVwZGF0ZUFuaW1hdGlvblxyXG4gICAgLyoqXHJcbiAgICAgKiBVcGRhdGVzIHRoZSBBbmltYXRpb24uXHJcbiAgICAgKiBHZXRzIGNhbGxlZCBldmVyeSB0aW1lIHRoZSBMb29wIGZpcmVzIHRoZSBMT09QX0ZSQU1FIEV2ZW50LlxyXG4gICAgICogVXNlcyB0aGUgYnVpbHQtaW4gdGltZSB1bmxlc3MgYSBkaWZmZXJlbnQgdGltZSBpcyBzcGVjaWZpZWQuXHJcbiAgICAgKiBNYXkgYWxzbyBiZSBjYWxsZWQgZnJvbSB1cGRhdGVBbmltYXRpb24oKS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB1cGRhdGVBbmltYXRpb25Mb29wKF9lOiBFdmVudCwgX3RpbWU6IG51bWJlcik6IFtNdXRhdG9yLCBudW1iZXJdIHtcclxuICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZSA9PSAwKVxyXG4gICAgICAgIHJldHVybiBbbnVsbCwgMF07XHJcbiAgICAgIGxldCB0aW1lOiBudW1iZXIgPSBfdGltZSB8fCB0aGlzLmxvY2FsVGltZS5nZXQoKTtcclxuICAgICAgaWYgKHRoaXMucGxheWJhY2sgPT0gQU5JTUFUSU9OX1BMQVlCQUNLLkZSQU1FQkFTRUQpIHtcclxuICAgICAgICB0aW1lID0gdGhpcy5sYXN0VGltZSArICgxMDAwIC8gdGhpcy5hbmltYXRpb24uZnBzKTtcclxuICAgICAgfVxyXG4gICAgICBsZXQgZGlyZWN0aW9uOiBudW1iZXIgPSB0aGlzLmNhbGN1bGF0ZURpcmVjdGlvbih0aW1lKTtcclxuICAgICAgdGltZSA9IHRoaXMuYXBwbHlQbGF5bW9kZXModGltZSk7XHJcbiAgICAgIHRoaXMuZXhlY3V0ZUV2ZW50cyh0aGlzLmFuaW1hdGlvbi5nZXRFdmVudHNUb0ZpcmUodGhpcy5sYXN0VGltZSwgdGltZSwgdGhpcy5wbGF5YmFjaywgZGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICBpZiAodGhpcy5sYXN0VGltZSAhPSB0aW1lKSB7XHJcbiAgICAgICAgdGhpcy5sYXN0VGltZSA9IHRpbWU7XHJcbiAgICAgICAgdGltZSA9IHRpbWUgJSB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWU7XHJcbiAgICAgICAgbGV0IG11dGF0b3I6IE11dGF0b3IgPSB0aGlzLmFuaW1hdGlvbi5nZXRNdXRhdGVkKHRpbWUsIGRpcmVjdGlvbiwgdGhpcy5wbGF5YmFjayk7XHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0Q29udGFpbmVyKCkpIHtcclxuICAgICAgICAgIHRoaXMuZ2V0Q29udGFpbmVyKCkuYXBwbHlBbmltYXRpb24obXV0YXRvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbXV0YXRvciwgdGltZV07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIFtudWxsLCB0aW1lXTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpcmVzIGFsbCBjdXN0b20gZXZlbnRzIHRoZSBBbmltYXRpb24gc2hvdWxkIGhhdmUgZmlyZWQgYmV0d2VlbiB0aGUgbGFzdCBmcmFtZSBhbmQgdGhlIGN1cnJlbnQgZnJhbWUuXHJcbiAgICAgKiBAcGFyYW0gZXZlbnRzIGEgbGlzdCBvZiBuYW1lcyBvZiBjdXN0b20gZXZlbnRzIHRvIGZpcmVcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBleGVjdXRlRXZlbnRzKGV2ZW50czogc3RyaW5nW10pOiB2b2lkIHtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoZXZlbnRzW2ldKSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGFjdHVhbCB0aW1lIHRvIHVzZSwgdXNpbmcgdGhlIGN1cnJlbnQgcGxheW1vZGVzLlxyXG4gICAgICogQHBhcmFtIF90aW1lIHRoZSB0aW1lIHRvIGFwcGx5IHRoZSBwbGF5bW9kZXMgdG9cclxuICAgICAqIEByZXR1cm5zIHRoZSByZWNhbGN1bGF0ZWQgdGltZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFwcGx5UGxheW1vZGVzKF90aW1lOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICBzd2l0Y2ggKHRoaXMucGxheW1vZGUpIHtcclxuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5TVE9QOlxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxUaW1lLmdldE9mZnNldCgpO1xyXG4gICAgICAgIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlBMQVlPTkNFOlxyXG4gICAgICAgICAgaWYgKF90aW1lID49IHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZSAtIDAuMDE7ICAgICAvL1RPRE86IHRoaXMgbWlnaHQgY2F1c2Ugc29tZSBpc3N1ZXNcclxuICAgICAgICAgIGVsc2UgcmV0dXJuIF90aW1lO1xyXG4gICAgICAgIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlBMQVlPTkNFU1RPUEFGVEVSOlxyXG4gICAgICAgICAgaWYgKF90aW1lID49IHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZSArIDAuMDE7ICAgICAvL1RPRE86IHRoaXMgbWlnaHQgY2F1c2Ugc29tZSBpc3N1ZXNcclxuICAgICAgICAgIGVsc2UgcmV0dXJuIF90aW1lO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICByZXR1cm4gX3RpbWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGN1bGF0ZXMgYW5kIHJldHVybnMgdGhlIGRpcmVjdGlvbiB0aGUgYW5pbWF0aW9uIHNob3VsZCBjdXJyZW50bHkgYmUgcGxheWluZyBpbi5cclxuICAgICAqIEBwYXJhbSBfdGltZSB0aGUgdGltZSBhdCB3aGljaCB0byBjYWxjdWxhdGUgdGhlIGRpcmVjdGlvblxyXG4gICAgICogQHJldHVybnMgMSBpZiBmb3J3YXJkLCAwIGlmIHN0b3AsIC0xIGlmIGJhY2t3YXJkc1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNhbGN1bGF0ZURpcmVjdGlvbihfdGltZTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgc3dpdGNoICh0aGlzLnBsYXltb2RlKSB7XHJcbiAgICAgICAgY2FzZSBBTklNQVRJT05fUExBWU1PREUuU1RPUDpcclxuICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIC8vIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlBJTkdQT05HOlxyXG4gICAgICAgIC8vICAgaWYgKE1hdGguZmxvb3IoX3RpbWUgLyB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUpICUgMiA9PSAwKVxyXG4gICAgICAgIC8vICAgICByZXR1cm4gMTtcclxuICAgICAgICAvLyAgIGVsc2VcclxuICAgICAgICAvLyAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlJFVkVSU0VMT09QOlxyXG4gICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlBMQVlPTkNFOlxyXG4gICAgICAgIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlBMQVlPTkNFU1RPUEFGVEVSOlxyXG4gICAgICAgICAgaWYgKF90aW1lID49IHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAgIH1cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFVwZGF0ZXMgdGhlIHNjYWxlIG9mIHRoZSBhbmltYXRpb24gaWYgdGhlIHVzZXIgY2hhbmdlcyBpdCBvciBpZiB0aGUgZ2xvYmFsIGdhbWUgdGltZXIgY2hhbmdlZCBpdHMgc2NhbGUuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdXBkYXRlU2NhbGUoKTogdm9pZCB7XHJcbiAgICAgIGxldCBuZXdTY2FsZTogbnVtYmVyID0gdGhpcy5zcGVlZFNjYWxlO1xyXG4gICAgICBpZiAodGhpcy5zcGVlZFNjYWxlc1dpdGhHbG9iYWxTcGVlZClcclxuICAgICAgICBuZXdTY2FsZSAqPSBUaW1lLmdhbWUuZ2V0U2NhbGUoKTtcclxuICAgICAgdGhpcy5sb2NhbFRpbWUuc2V0U2NhbGUobmV3U2NhbGUpO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbiAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEF0dGFjaGVzIGEgW1tDb21wb25lbnRBdWRpb11dIHRvIGEgW1tOb2RlXV0uXHJcbiAgICAgKiBPbmx5IGEgc2luZ2xlIFtbQXVkaW9dXSBjYW4gYmUgdXNlZCB3aXRoaW4gYSBzaW5nbGUgW1tDb21wb25lbnRBdWRpb11dXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudEF1ZGlvIGV4dGVuZHMgQ29tcG9uZW50IGltcGxlbWVudHMgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBcclxuICAgICAgICBwdWJsaWMgYXVkaW86IEF1ZGlvIHwgbnVsbDtcclxuICAgICAgICBwdWJsaWMgYXVkaW9Pc2NpbGxhdG9yOiBBdWRpb09zY2lsbGF0b3I7XHJcblxyXG4gICAgICAgIHB1YmxpYyBpc0xvY2FsaXNlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHB1YmxpYyBpc0ZpbHRlcmVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIGlzRGVsYXllZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHByb3RlY3RlZCBzaW5nbGV0b246IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBsb2NhbGlzYXRpb246IEF1ZGlvTG9jYWxpc2F0aW9uIHwgbnVsbDtcclxuICAgICAgICBwcml2YXRlIGZpbHRlcjogQXVkaW9GaWx0ZXIgfCBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgZGVsYXk6IEF1ZGlvRGVsYXkgfCBudWxsO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZSBDb21wb25lbnQgQXVkaW8gZm9yIFxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW8gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2F1ZGlvPzogQXVkaW8sIF9hdWRpb09zY2lsbGF0b3I/OiBBdWRpb09zY2lsbGF0b3IpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICAgICAgaWYgKF9hdWRpbykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBdWRpbyhfYXVkaW8pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBzZXQgQXVkaW9GaWx0ZXIgaW4gQ29tcG9uZW50QXVkaW9cclxuICAgICAgICAgKiBAcGFyYW0gX2ZpbHRlciBBdWRpb0ZpbHRlciBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0RmlsdGVyKF9maWx0ZXI6IEF1ZGlvRmlsdGVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsdGVyID0gX2ZpbHRlcjtcclxuICAgICAgICAgICAgdGhpcy5pc0ZpbHRlcmVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRGaWx0ZXIoKTogQXVkaW9GaWx0ZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RGVsYXkoX2RlbGF5OiBBdWRpb0RlbGF5KTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuZGVsYXkgPSBfZGVsYXk7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEZWxheWVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREZWxheSgpOiBBdWRpb0RlbGF5IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVsYXk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0TG9jYWxpc2F0aW9uKF9sb2NhbGlzYXRpb246IEF1ZGlvTG9jYWxpc2F0aW9uKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxpc2F0aW9uID0gX2xvY2FsaXNhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5pc0xvY2FsaXNlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TG9jYWxpc2F0aW9uKCk6IEF1ZGlvTG9jYWxpc2F0aW9uIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxpc2F0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUGxheSBBdWRpbyBhdCBjdXJyZW50IHRpbWUgb2YgQXVkaW9Db250ZXh0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHBsYXlBdWRpbyhfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX29mZnNldD86IG51bWJlciwgX2R1cmF0aW9uPzogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW8uaW5pdEJ1ZmZlclNvdXJjZShfYXVkaW9TZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdEF1ZGlvTm9kZXMoX2F1ZGlvU2V0dGluZ3MpO1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvLmdldEJ1ZmZlclNvdXJjZU5vZGUoKS5zdGFydChfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSwgX29mZnNldCwgX2R1cmF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFkZHMgYW4gW1tBdWRpb11dIHRvIHRoZSBbW0NvbXBvbmVudEF1ZGlvXV1cclxuICAgICAgICAgKiBAcGFyYW0gX2F1ZGlvIEF1ZGlvIERhdGEgYXMgW1tBdWRpb11dXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldEF1ZGlvKF9hdWRpbzogQXVkaW8pOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpbyA9IF9hdWRpbztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRBdWRpbygpOiBBdWRpbyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF1ZGlvO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIFRyYW5zZmVyXHJcbiAgICAgICAgcHVibGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBpc0ZpbHRlcmVkOiB0aGlzLmlzRmlsdGVyZWQsXHJcbiAgICAgICAgICAgICAgICBpc0RlbGF5ZWQ6IHRoaXMuaXNEZWxheWVkLFxyXG4gICAgICAgICAgICAgICAgaXNMb2NhbGlzZWQ6IHRoaXMuaXNMb2NhbGlzZWQsXHJcbiAgICAgICAgICAgICAgICBhdWRpbzogdGhpcy5hdWRpbyxcclxuICAgICAgICAgICAgICAgIGZpbHRlcjogdGhpcy5maWx0ZXIsXHJcbiAgICAgICAgICAgICAgICBkZWxheTogdGhpcy5kZWxheSxcclxuICAgICAgICAgICAgICAgIGxvY2FsaXNhdGlvbjogdGhpcy5sb2NhbGlzYXRpb25cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgXHJcbiAgICAgICAgcHVibGljIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgICAgICAgdGhpcy5pc0ZpbHRlcmVkID0gX3NlcmlhbGl6YXRpb24uaXNGaWx0ZXJlZDtcclxuICAgICAgICAgICAgdGhpcy5pc0RlbGF5ZWQgPSBfc2VyaWFsaXphdGlvbi5pc0RlbGF5ZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuaXNMb2NhbGlzZWQgPSBfc2VyaWFsaXphdGlvbi5pc0xvY2FsaXNlZDtcclxuICAgICAgICAgICAgdGhpcy5hdWRpbyA9IF9zZXJpYWxpemF0aW9uLmF1ZGlvO1xyXG4gICAgICAgICAgICB0aGlzLmZpbHRlciA9IF9zZXJpYWxpemF0aW9uLmZpbHRlcjtcclxuICAgICAgICAgICAgdGhpcy5kZWxheSA9IF9zZXJpYWxpemF0aW9uLmRlbGF5O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5hdWRpbztcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZmlsdGVyO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5kZWxheTtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMubG9jYWxpc2F0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRmluYWwgYXR0YWNobWVudHMgZm9yIHRoZSBBdWRpbyBOb2RlcyBpbiBmb2xsb3dpbmcgb3JkZXIuXHJcbiAgICAgICAgICogVGhpcyBtZXRob2QgbmVlZHMgdG8gYmUgY2FsbGVkIHdoZW5ldmVyIHRoZXJlIGlzIGEgY2hhbmdlIG9mIHBhcnRzIGluIHRoZSBbW0NvbXBvbmVudEF1ZGlvXV0uXHJcbiAgICAgICAgICogMS4gTG9jYWwgR2FpblxyXG4gICAgICAgICAqIDIuIExvY2FsaXNhdGlvblxyXG4gICAgICAgICAqIDMuIEZpbHRlclxyXG4gICAgICAgICAqIDQuIERlbGF5XHJcbiAgICAgICAgICogNS4gTWFzdGVyIEdhaW5cclxuICAgICAgICAgKi9cclxuICAgICAgICAgcHJpdmF0ZSBjb25uZWN0QXVkaW9Ob2RlcyhfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncyk6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zdCBidWZmZXJTb3VyY2U6IEF1ZGlvQnVmZmVyU291cmNlTm9kZSA9IHRoaXMuYXVkaW8uZ2V0QnVmZmVyU291cmNlTm9kZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBsR2FpbjogR2Fpbk5vZGUgPSB0aGlzLmF1ZGlvLmdldExvY2FsR2FpbigpO1xyXG4gICAgICAgICAgICBsZXQgcGFubmVyOiBQYW5uZXJOb2RlO1xyXG4gICAgICAgICAgICBsZXQgZmlsdDogQmlxdWFkRmlsdGVyTm9kZTtcclxuICAgICAgICAgICAgbGV0IGRlbGF5OiBEZWxheU5vZGU7XHJcbiAgICAgICAgICAgIGNvbnN0IG1HYWluOiBHYWluTm9kZSA9IF9hdWRpb1NldHRpbmdzLm1hc3RlckdhaW47XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGluZyBQcm9wZXJ0aWVzIGZvciBBdWRpb1wiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXCIpO1xyXG5cclxuICAgICAgICAgICAgYnVmZmVyU291cmNlLmNvbm5lY3QobEdhaW4pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNMb2NhbGlzZWQgJiYgdGhpcy5sb2NhbGlzYXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IExvY2FsaXNhdGlvblwiKTtcclxuICAgICAgICAgICAgICAgIHBhbm5lciA9IHRoaXMubG9jYWxpc2F0aW9uLnBhbm5lck5vZGU7XHJcbiAgICAgICAgICAgICAgICBsR2Fpbi5jb25uZWN0KHBhbm5lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNGaWx0ZXJlZCAmJiB0aGlzLmZpbHRlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IEZpbHRlclwiKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ID0gdGhpcy5maWx0ZXIuYXVkaW9GaWx0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLmNvbm5lY3QoZmlsdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRGVsYXllZCAmJiB0aGlzLmRlbGF5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IERlbGF5XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheSA9IHRoaXMuZGVsYXkuYXVkaW9EZWxheTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdC5jb25uZWN0KGRlbGF5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE1hc3RlciBHYWluXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheS5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdC5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RlbGF5ZWQgJiYgdGhpcy5kZWxheSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBEZWxheVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsYXkgPSB0aGlzLmRlbGF5LmF1ZGlvRGVsYXk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhbm5lci5jb25uZWN0KGRlbGF5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE1hc3RlciBHYWluXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheS5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFubmVyLmNvbm5lY3QobUdhaW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLmlzRmlsdGVyZWQgJiYgdGhpcy5maWx0ZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IEZpbHRlclwiKTtcclxuICAgICAgICAgICAgICAgIGZpbHQgPSB0aGlzLmZpbHRlci5hdWRpb0ZpbHRlcjtcclxuICAgICAgICAgICAgICAgIGxHYWluLmNvbm5lY3QoZmlsdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEZWxheWVkICYmIHRoaXMuZGVsYXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBEZWxheVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWxheSA9IHRoaXMuZGVsYXkuYXVkaW9EZWxheTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0LmNvbm5lY3QoZGVsYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWxheS5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0LmNvbm5lY3QobUdhaW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaXNEZWxheWVkICYmIHRoaXMuZGVsYXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IERlbGF5XCIpO1xyXG4gICAgICAgICAgICAgICAgZGVsYXkgPSB0aGlzLmRlbGF5LmF1ZGlvRGVsYXk7XHJcbiAgICAgICAgICAgICAgICBsR2Fpbi5jb25uZWN0KGRlbGF5KTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgIGRlbGF5LmNvbm5lY3QobUdhaW4pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE9ubHkgTWFzdGVyIEdhaW5cIik7XHJcbiAgICAgICAgICAgICAgICBsR2Fpbi5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEF0dGFjaGVzIGFuIFtbQXVkaW9MaXN0ZW5lcl1dIHRvIHRoZSBub2RlXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudEF1ZGlvTGlzdGVuZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cclxuICAgICAgICBwcml2YXRlIGF1ZGlvTGlzdGVuZXI6IEF1ZGlvTGlzdGVuZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvbkJhc2U6IFZlY3RvcjM7XHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvblVQOiBWZWN0b3IzO1xyXG4gICAgICAgIHByaXZhdGUgcG9zaXRpb25GVzogVmVjdG9yMztcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29uc3RydWN0b3Igb2YgdGhlIEF1ZGlvTGlzdGVuZXIgY2xhc3NcclxuICAgICAgICAgKiBAcGFyYW0gX2F1ZGlvQ29udGV4dCBBdWRpbyBDb250ZXh0IGZyb20gQXVkaW9TZXNzaW9uRGF0YVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9MaXN0ZW5lciA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmxpc3RlbmVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEF1ZGlvTGlzdGVuZXIoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkubGlzdGVuZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0QXVkaW9MaXN0ZW5lcigpOiBBdWRpb0xpc3RlbmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXVkaW9MaXN0ZW5lcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFdlIHdpbGwgY2FsbCBzZXRBdWRpb0xpc3RlbmVyUG9zaXRpb24gd2hlbmV2ZXIgdGhlcmUgaXMgYSBuZWVkIHRvIGNoYW5nZSBQb3NpdGlvbnMuXHJcbiAgICAgICAgICogQWxsIHRoZSBwb3NpdGlvbiB2YWx1ZXMgc2hvdWxkIGJlIGlkZW50aWNhbCB0byB0aGUgY3VycmVudCBQb3NpdGlvbiB0aGlzIGlzIGF0dGFjaGVkIHRvLlxyXG4gICAgICAgICAqICAgICAgIFxyXG4gICAgICAgICAqICAgICBfX3xfX19cclxuICAgICAgICAgKiAgICB8ICB8ICB8XHJcbiAgICAgICAgICogICAgfCAgwrAtLXwtLVxyXG4gICAgICAgICAqICAgIHwvX19fX3xcclxuICAgICAgICAgKiAgIC9cclxuICAgICAgICAgKiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0TGlzdGVuZXJQb3NpdGlvbihfcG9zaXRpb246IFZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJhc2UgPSBfcG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25YLnZhbHVlID0gdGhpcy5wb3NpdGlvbkJhc2UueDtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWS52YWx1ZSA9IC10aGlzLnBvc2l0aW9uQmFzZS56O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25aLnZhbHVlID0gdGhpcy5wb3NpdGlvbkJhc2UueTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU2V0IExpc3RlbmVyIFBvc2l0aW9uOiBYOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5wb3NpdGlvblgudmFsdWUgKyBcIiB8IFk6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25aLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRMaXN0ZW5lclBvc2l0aW9uKCk6IFZlY3RvcjMge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbkJhc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBGVURHRSBTWVNURU1cclxuICAgICAgICAgKiBcclxuICAgICAgICAgKiAgICAgIFVQIChZKVxyXG4gICAgICAgICAqICAgICAgIF5cclxuICAgICAgICAgKiAgICAgX198X19fXHJcbiAgICAgICAgICogICAgfCAgfCAgfFxyXG4gICAgICAgICAqICAgIHwgIE8tLXwtLT4gRk9SV0FSRCAoWilcclxuICAgICAgICAgKiAgICB8X19fX198XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldExpc3RlbmVyUG9zaXRpb25Gb3J3YXJkKF9wb3NpdGlvbjogVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uRlcgPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIC8vU2V0IGZvcndhcmQgbG9va2luZyBwb3NpdGlvbiBvZiB0aGUgQXVkaW9MaXN0ZW5lclxyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIuZm9yd2FyZFgudmFsdWUgPSB0aGlzLnBvc2l0aW9uRlcueDtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRZLnZhbHVlID0gLXRoaXMucG9zaXRpb25GVy56ICsgMTtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRaLnZhbHVlID0gdGhpcy5wb3NpdGlvbkZXLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TGlzdGVuZXJQb3NpdGlvbkZvcndhcmQoKTogVmVjdG9yMyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uRlc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiAgICAgIFVQIChaKVxyXG4gICAgICAgICAqICAgICAgIF5cclxuICAgICAgICAgKiAgICAgX198X19fXHJcbiAgICAgICAgICogICAgfCAgfCAgfFxyXG4gICAgICAgICAqICAgIHwgIE8tLXwtLT4gRk9SV0FSRCAoWClcclxuICAgICAgICAgKiAgICB8X19fX198XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldExpc3RlbmVyUG9zdGl0aW9uVXAoX3Bvc2l0aW9uOiBWZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25VUCA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgLy9TZXQgdXB3YXJkIGxvb2tpbmcgcG9zaXRpb24gb2YgdGhlIEF1ZGlvTGlzdGVuZXJcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLnVwWC52YWx1ZSA9IHRoaXMucG9zaXRpb25VUC54O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIudXBZLnZhbHVlID0gLXRoaXMucG9zaXRpb25VUC56O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIudXBaLnZhbHVlID0gdGhpcy5wb3NpdGlvblVQLnkgKyAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldExpc3RlbmVyUG9zaXRpb25VcCgpOiBWZWN0b3IzIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucG9zaXRpb25VUDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCBhbGwgcG9zaXRpb25hbCBWYWx1ZXMgYmFzZWQgb24gYSBzaW5nbGUgUG9zaXRpb25cclxuICAgICAgICAgKiBAcGFyYW0gX3Bvc2l0aW9uIHBvc2l0aW9uIG9mIHRoZSBPYmplY3RcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgdXBkYXRlUG9zaXRpb25zKF9wb3NpdGlvbjogVmVjdG9yMy8qLCBfcG9zaXRpb25Gb3J3YXJkOiBWZWN0b3IzLCBfcG9zaXRpb25VcDogVmVjdG9yMyovKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TGlzdGVuZXJQb3NpdGlvbihfcG9zaXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLnNldExpc3RlbmVyUG9zaXRpb25Gb3J3YXJkKF9wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TGlzdGVuZXJQb3N0aXRpb25VcChfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2hvdyBhbGwgU2V0dGluZ3MgaW5zaWRlIG9mIFtbQ29tcG9uZW50QXVkaW9MaXN0ZW5lcl1dLlxyXG4gICAgICAgICAqIE1ldGhvZCBvbmx5IGZvciBEZWJ1Z2dpbmcgUHVycG9zZXMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNob3dMaXN0ZW5lclNldHRpbmdzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTaG93IGFsbCBTZXR0aW5ncyBvZiBMaXN0ZW5lclwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuZXIgUG9zaXRpb24gQmFzZTogWDogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25YLnZhbHVlICsgXCIgfCBZOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5wb3NpdGlvblkudmFsdWUgKyBcIiB8IFo6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWi52YWx1ZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuZXIgUG9zaXRpb24gVXA6IFg6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnVwWC52YWx1ZSArIFwiIHwgWTogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIudXBZLnZhbHVlICsgXCIgfCBaOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci51cFoudmFsdWUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxpc3RlbmVyIFBvc2l0aW9uIEZvcndhcmQ6IFg6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRYLnZhbHVlICsgXCIgfCBZOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5mb3J3YXJkWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIuZm9yd2FyZFoudmFsdWUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxyXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XHJcbiAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgYXVkaW9MaXN0ZW5lcjogdGhpcy5hdWRpb0xpc3RlbmVyLFxyXG4gICAgICAgICAgICAgICAgcG9zQmFzZTogdGhpcy5wb3NpdGlvbkJhc2UsXHJcbiAgICAgICAgICAgICAgICBwb3NGVzogdGhpcy5wb3NpdGlvbkZXLFxyXG4gICAgICAgICAgICAgICAgcG9zVVA6IHRoaXMucG9zaXRpb25VUFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICBcclxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIgPSBfc2VyaWFsaXphdGlvbi5hdWRpb0xpc3RlbmVyO1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uQmFzZSA9IF9zZXJpYWxpemF0aW9uLnBvc0Jhc2U7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25GVyA9IF9zZXJpYWxpemF0aW9uLnBvc0ZXO1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uVVAgPSBfc2VyaWFsaXphdGlvbi5wb3NVUDtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuYXVkaW9MaXN0ZW5lcjtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMucG9zaXRpb25CYXNlO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wb3NpdGlvbkZXO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wb3NpdGlvblVQO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29tcG9uZW50LnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIGV4cG9ydCBlbnVtIEZJRUxEX09GX1ZJRVcge1xyXG4gICAgICAgIEhPUklaT05UQUwsIFZFUlRJQ0FMLCBESUFHT05BTFxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIGlkZW50aWZpZXJzIGZvciB0aGUgdmFyaW91cyBwcm9qZWN0aW9ucyBhIGNhbWVyYSBjYW4gcHJvdmlkZS4gIFxyXG4gICAgICogVE9ETzogY2hhbmdlIGJhY2sgdG8gbnVtYmVyIGVudW0gaWYgc3RyaW5ncyBub3QgbmVlZGVkXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBlbnVtIFBST0pFQ1RJT04ge1xyXG4gICAgICAgIENFTlRSQUwgPSBcImNlbnRyYWxcIixcclxuICAgICAgICBPUlRIT0dSQVBISUMgPSBcIm9ydGhvZ3JhcGhpY1wiLFxyXG4gICAgICAgIERJTUVUUklDID0gXCJkaW1ldHJpY1wiLFxyXG4gICAgICAgIFNURVJFTyA9IFwic3RlcmVvXCJcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGNhbWVyYSBjb21wb25lbnQgaG9sZHMgdGhlIHByb2plY3Rpb24tbWF0cml4IGFuZCBvdGhlciBkYXRhIG5lZWRlZCB0byByZW5kZXIgYSBzY2VuZSBmcm9tIHRoZSBwZXJzcGVjdGl2ZSBvZiB0aGUgbm9kZSBpdCBpcyBhdHRhY2hlZCB0by5cclxuICAgICAqIEBhdXRob3JzIEphc2NoYSBLYXJhZ8O2bCwgSEZVLCAyMDE5IHwgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudENhbWVyYSBleHRlbmRzIENvbXBvbmVudCB7XHJcbiAgICAgICAgcHVibGljIHBpdm90OiBNYXRyaXg0eDQgPSBNYXRyaXg0eDQuSURFTlRJVFk7XHJcbiAgICAgICAgcHVibGljIGJhY2tncm91bmRDb2xvcjogQ29sb3IgPSBuZXcgQ29sb3IoMCwgMCwgMCwgMSk7IC8vIFRoZSBjb2xvciBvZiB0aGUgYmFja2dyb3VuZCB0aGUgY2FtZXJhIHdpbGwgcmVuZGVyLlxyXG4gICAgICAgIC8vcHJpdmF0ZSBvcnRob2dyYXBoaWM6IGJvb2xlYW4gPSBmYWxzZTsgLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBpbWFnZSB3aWxsIGJlIHJlbmRlcmVkIHdpdGggcGVyc3BlY3RpdmUgb3Igb3J0aG9ncmFwaGljIHByb2plY3Rpb24uXHJcbiAgICAgICAgcHJpdmF0ZSBwcm9qZWN0aW9uOiBQUk9KRUNUSU9OID0gUFJPSkVDVElPTi5DRU5UUkFMO1xyXG4gICAgICAgIHByaXZhdGUgdHJhbnNmb3JtOiBNYXRyaXg0eDQgPSBuZXcgTWF0cml4NHg0OyAvLyBUaGUgbWF0cml4IHRvIG11bHRpcGx5IGVhY2ggc2NlbmUgb2JqZWN0cyB0cmFuc2Zvcm1hdGlvbiBieSwgdG8gZGV0ZXJtaW5lIHdoZXJlIGl0IHdpbGwgYmUgZHJhd24uXHJcbiAgICAgICAgcHJpdmF0ZSBmaWVsZE9mVmlldzogbnVtYmVyID0gNDU7IC8vIFRoZSBjYW1lcmEncyBzZW5zb3JhbmdsZS5cclxuICAgICAgICBwcml2YXRlIGFzcGVjdFJhdGlvOiBudW1iZXIgPSAxLjA7XHJcbiAgICAgICAgcHJpdmF0ZSBkaXJlY3Rpb246IEZJRUxEX09GX1ZJRVcgPSBGSUVMRF9PRl9WSUVXLkRJQUdPTkFMO1xyXG4gICAgICAgIHByaXZhdGUgYmFja2dyb3VuZEVuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlOyAvLyBEZXRlcm1pbmVzIHdoZXRoZXIgb3Igbm90IHRoZSBiYWNrZ3JvdW5kIG9mIHRoaXMgY2FtZXJhIHdpbGwgYmUgcmVuZGVyZWQuXHJcbiAgICAgICAgLy8gVE9ETzogZXhhbWluZSwgaWYgYmFja2dyb3VuZCBzaG91bGQgYmUgYW4gYXR0cmlidXRlIG9mIENhbWVyYSBvciBWaWV3cG9ydFxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0UHJvamVjdGlvbigpOiBQUk9KRUNUSU9OIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvamVjdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRCYWNrZ3JvdW5kRW5hYmxlZCgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmFja2dyb3VuZEVuYWJsZWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0QXNwZWN0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFzcGVjdFJhdGlvO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEZpZWxkT2ZWaWV3KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpZWxkT2ZWaWV3O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERpcmVjdGlvbigpOiBGSUVMRF9PRl9WSUVXIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlyZWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0dXJucyB0aGUgbXVsdGlwbGlrYXRpb24gb2YgdGhlIHdvcmxkdHJhbnNmb3JtYXRpb24gb2YgdGhlIGNhbWVyYSBjb250YWluZXIgd2l0aCB0aGUgcHJvamVjdGlvbiBtYXRyaXhcclxuICAgICAgICAgKiBAcmV0dXJucyB0aGUgd29ybGQtcHJvamVjdGlvbi1tYXRyaXhcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0IFZpZXdQcm9qZWN0aW9uTWF0cml4KCk6IE1hdHJpeDR4NCB7XHJcbiAgICAgICAgICAgIGxldCB3b3JsZDogTWF0cml4NHg0ID0gdGhpcy5waXZvdDtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHdvcmxkID0gTWF0cml4NHg0Lk1VTFRJUExJQ0FUSU9OKHRoaXMuZ2V0Q29udGFpbmVyKCkubXR4V29ybGQsIHRoaXMucGl2b3QpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChfZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIC8vIG5vIGNvbnRhaW5lciBub2RlIG9yIG5vIHdvcmxkIHRyYW5zZm9ybWF0aW9uIGZvdW5kIC0+IGNvbnRpbnVlIHdpdGggcGl2b3Qgb25seVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCB2aWV3TWF0cml4OiBNYXRyaXg0eDQgPSBNYXRyaXg0eDQuSU5WRVJTSU9OKHdvcmxkKTsgXHJcbiAgICAgICAgICAgIHJldHVybiBNYXRyaXg0eDQuTVVMVElQTElDQVRJT04odGhpcy50cmFuc2Zvcm0sIHZpZXdNYXRyaXgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0IHRoZSBjYW1lcmEgdG8gcGVyc3BlY3RpdmUgcHJvamVjdGlvbi4gVGhlIHdvcmxkIG9yaWdpbiBpcyBpbiB0aGUgY2VudGVyIG9mIHRoZSBjYW52YXNlbGVtZW50LlxyXG4gICAgICAgICAqIEBwYXJhbSBfYXNwZWN0IFRoZSBhc3BlY3QgcmF0aW8gYmV0d2VlbiB3aWR0aCBhbmQgaGVpZ2h0IG9mIHByb2plY3Rpb25zcGFjZS4oRGVmYXVsdCA9IGNhbnZhcy5jbGllbnRXaWR0aCAvIGNhbnZhcy5DbGllbnRIZWlnaHQpXHJcbiAgICAgICAgICogQHBhcmFtIF9maWVsZE9mVmlldyBUaGUgZmllbGQgb2YgdmlldyBpbiBEZWdyZWVzLiAoRGVmYXVsdCA9IDQ1KVxyXG4gICAgICAgICAqIEBwYXJhbSBfZGlyZWN0aW9uIFRoZSBwbGFuZSBvbiB3aGljaCB0aGUgZmllbGRPZlZpZXctQW5nbGUgaXMgZ2l2ZW4gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHByb2plY3RDZW50cmFsKF9hc3BlY3Q6IG51bWJlciA9IHRoaXMuYXNwZWN0UmF0aW8sIF9maWVsZE9mVmlldzogbnVtYmVyID0gdGhpcy5maWVsZE9mVmlldywgX2RpcmVjdGlvbjogRklFTERfT0ZfVklFVyA9IHRoaXMuZGlyZWN0aW9uKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXNwZWN0UmF0aW8gPSBfYXNwZWN0O1xyXG4gICAgICAgICAgICB0aGlzLmZpZWxkT2ZWaWV3ID0gX2ZpZWxkT2ZWaWV3O1xyXG4gICAgICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMucHJvamVjdGlvbiA9IFBST0pFQ1RJT04uQ0VOVFJBTDtcclxuICAgICAgICAgICAgdGhpcy50cmFuc2Zvcm0gPSBNYXRyaXg0eDQuUFJPSkVDVElPTl9DRU5UUkFMKF9hc3BlY3QsIHRoaXMuZmllbGRPZlZpZXcsIDEsIDIwMDAsIHRoaXMuZGlyZWN0aW9uKTsgLy8gVE9ETzogcmVtb3ZlIG1hZ2ljIG51bWJlcnNcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0IHRoZSBjYW1lcmEgdG8gb3J0aG9ncmFwaGljIHByb2plY3Rpb24uIFRoZSBvcmlnaW4gaXMgaW4gdGhlIHRvcCBsZWZ0IGNvcm5lciBvZiB0aGUgY2FudmFzLlxyXG4gICAgICAgICAqIEBwYXJhbSBfbGVmdCBUaGUgcG9zaXRpb252YWx1ZSBvZiB0aGUgcHJvamVjdGlvbnNwYWNlJ3MgbGVmdCBib3JkZXIuIChEZWZhdWx0ID0gMClcclxuICAgICAgICAgKiBAcGFyYW0gX3JpZ2h0IFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyByaWdodCBib3JkZXIuIChEZWZhdWx0ID0gY2FudmFzLmNsaWVudFdpZHRoKVxyXG4gICAgICAgICAqIEBwYXJhbSBfYm90dG9tIFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyBib3R0b20gYm9yZGVyLihEZWZhdWx0ID0gY2FudmFzLmNsaWVudEhlaWdodClcclxuICAgICAgICAgKiBAcGFyYW0gX3RvcCBUaGUgcG9zaXRpb252YWx1ZSBvZiB0aGUgcHJvamVjdGlvbnNwYWNlJ3MgdG9wIGJvcmRlci4oRGVmYXVsdCA9IDApXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHByb2plY3RPcnRob2dyYXBoaWMoX2xlZnQ6IG51bWJlciA9IDAsIF9yaWdodDogbnVtYmVyID0gUmVuZGVyTWFuYWdlci5nZXRDYW52YXMoKS5jbGllbnRXaWR0aCwgX2JvdHRvbTogbnVtYmVyID0gUmVuZGVyTWFuYWdlci5nZXRDYW52YXMoKS5jbGllbnRIZWlnaHQsIF90b3A6IG51bWJlciA9IDApOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9qZWN0aW9uID0gUFJPSkVDVElPTi5PUlRIT0dSQVBISUM7XHJcbiAgICAgICAgICAgIHRoaXMudHJhbnNmb3JtID0gTWF0cml4NHg0LlBST0pFQ1RJT05fT1JUSE9HUkFQSElDKF9sZWZ0LCBfcmlnaHQsIF9ib3R0b20sIF90b3AsIDQwMCwgLTQwMCk7IC8vIFRPRE86IGV4YW1pbmUgbWFnaWMgbnVtYmVycyFcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybiB0aGUgY2FsY3VsYXRlZCBub3JtZWQgZGltZW5zaW9uIG9mIHRoZSBwcm9qZWN0aW9uIHNwYWNlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldFByb2plY3Rpb25SZWN0YW5nbGUoKTogUmVjdGFuZ2xlIHtcclxuICAgICAgICAgICAgbGV0IHRhbkZvdjogbnVtYmVyID0gTWF0aC50YW4oTWF0aC5QSSAqIHRoaXMuZmllbGRPZlZpZXcgLyAzNjApOyAvLyBIYWxmIG9mIHRoZSBhbmdsZSwgdG8gY2FsY3VsYXRlIGRpbWVuc2lvbiBmcm9tIHRoZSBjZW50ZXIgLT4gcmlnaHQgYW5nbGVcclxuICAgICAgICAgICAgbGV0IHRhbkhvcml6b250YWw6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIGxldCB0YW5WZXJ0aWNhbDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRpcmVjdGlvbiA9PSBGSUVMRF9PRl9WSUVXLkRJQUdPTkFMKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXNwZWN0OiBudW1iZXIgPSBNYXRoLnNxcnQodGhpcy5hc3BlY3RSYXRpbyk7XHJcbiAgICAgICAgICAgICAgICB0YW5Ib3Jpem9udGFsID0gdGFuRm92ICogYXNwZWN0O1xyXG4gICAgICAgICAgICAgICAgdGFuVmVydGljYWwgPSB0YW5Gb3YgLyBhc3BlY3Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5kaXJlY3Rpb24gPT0gRklFTERfT0ZfVklFVy5WRVJUSUNBTCkge1xyXG4gICAgICAgICAgICAgICAgdGFuVmVydGljYWwgPSB0YW5Gb3Y7XHJcbiAgICAgICAgICAgICAgICB0YW5Ib3Jpem9udGFsID0gdGFuVmVydGljYWwgKiB0aGlzLmFzcGVjdFJhdGlvO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Ugey8vRk9WX0RJUkVDVElPTi5IT1JJWk9OVEFMXHJcbiAgICAgICAgICAgICAgICB0YW5Ib3Jpem9udGFsID0gdGFuRm92O1xyXG4gICAgICAgICAgICAgICAgdGFuVmVydGljYWwgPSB0YW5Ib3Jpem9udGFsIC8gdGhpcy5hc3BlY3RSYXRpbztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIFJlY3RhbmdsZS5HRVQoMCwgMCwgdGFuSG9yaXpvbnRhbCAqIDIsIHRhblZlcnRpY2FsICogMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNyZWdpb24gVHJhbnNmZXJcclxuICAgICAgICBwdWJsaWMgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xyXG4gICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogdGhpcy5iYWNrZ3JvdW5kQ29sb3IsXHJcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kRW5hYmxlZDogdGhpcy5iYWNrZ3JvdW5kRW5hYmxlZCxcclxuICAgICAgICAgICAgICAgIHByb2plY3Rpb246IHRoaXMucHJvamVjdGlvbixcclxuICAgICAgICAgICAgICAgIGZpZWxkT2ZWaWV3OiB0aGlzLmZpZWxkT2ZWaWV3LFxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uOiB0aGlzLmRpcmVjdGlvbixcclxuICAgICAgICAgICAgICAgIGFzcGVjdDogdGhpcy5hc3BlY3RSYXRpbyxcclxuICAgICAgICAgICAgICAgIHBpdm90OiB0aGlzLnBpdm90LnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICAgICAgW3N1cGVyLmNvbnN0cnVjdG9yLm5hbWVdOiBzdXBlci5zZXJpYWxpemUoKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gX3NlcmlhbGl6YXRpb24uYmFja2dyb3VuZENvbG9yO1xyXG4gICAgICAgICAgICB0aGlzLmJhY2tncm91bmRFbmFibGVkID0gX3NlcmlhbGl6YXRpb24uYmFja2dyb3VuZEVuYWJsZWQ7XHJcbiAgICAgICAgICAgIHRoaXMucHJvamVjdGlvbiA9IF9zZXJpYWxpemF0aW9uLnByb2plY3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMuZmllbGRPZlZpZXcgPSBfc2VyaWFsaXphdGlvbi5maWVsZE9mVmlldztcclxuICAgICAgICAgICAgdGhpcy5hc3BlY3RSYXRpbyA9IF9zZXJpYWxpemF0aW9uLmFzcGVjdDtcclxuICAgICAgICAgICAgdGhpcy5kaXJlY3Rpb24gPSBfc2VyaWFsaXphdGlvbi5kaXJlY3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMucGl2b3QuZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb24ucGl2b3QpO1xyXG4gICAgICAgICAgICBzdXBlci5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbltzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5wcm9qZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFBST0pFQ1RJT04uT1JUSE9HUkFQSElDOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvamVjdE9ydGhvZ3JhcGhpYygpOyAvLyBUT0RPOiBzZXJpYWxpemUgYW5kIGRlc2VyaWFsaXplIHBhcmFtZXRlcnNcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgUFJPSkVDVElPTi5DRU5UUkFMOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvamVjdENlbnRyYWwoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRNdXRhdG9yQXR0cmlidXRlVHlwZXMoX211dGF0b3I6IE11dGF0b3IpOiBNdXRhdG9yQXR0cmlidXRlVHlwZXMge1xyXG4gICAgICAgICAgICBsZXQgdHlwZXM6IE11dGF0b3JBdHRyaWJ1dGVUeXBlcyA9IHN1cGVyLmdldE11dGF0b3JBdHRyaWJ1dGVUeXBlcyhfbXV0YXRvcik7XHJcbiAgICAgICAgICAgIGlmICh0eXBlcy5kaXJlY3Rpb24pXHJcbiAgICAgICAgICAgICAgICB0eXBlcy5kaXJlY3Rpb24gPSBGSUVMRF9PRl9WSUVXO1xyXG4gICAgICAgICAgICBpZiAodHlwZXMucHJvamVjdGlvbilcclxuICAgICAgICAgICAgICAgIHR5cGVzLnByb2plY3Rpb24gPSBQUk9KRUNUSU9OO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbXV0YXRlKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLm11dGF0ZShfbXV0YXRvcik7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMucHJvamVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBQUk9KRUNUSU9OLkNFTlRSQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9qZWN0Q2VudHJhbCh0aGlzLmFzcGVjdFJhdGlvLCB0aGlzLmZpZWxkT2ZWaWV3LCB0aGlzLmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCByZWR1Y2VNdXRhdG9yKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBfbXV0YXRvci50cmFuc2Zvcm07XHJcbiAgICAgICAgICAgIHN1cGVyLnJlZHVjZU11dGF0b3IoX211dGF0b3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgZXhwb3J0IHR5cGUgVHlwZU9mTGlnaHQgPSBuZXcgKCkgPT4gTGlnaHQ7XHJcbiAgICAvKipcclxuICAgICAqIEJhc2VjbGFzcyBmb3IgZGlmZmVyZW50IGtpbmRzIG9mIGxpZ2h0cy4gXHJcbiAgICAgKiBAYXV0aG9ycyBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlnaHQgZXh0ZW5kcyBNdXRhYmxlIHtcclxuICAgICAgICBwdWJsaWMgY29sb3I6IENvbG9yO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb2xvcjogQ29sb3IgPSBuZXcgQ29sb3IoMSwgMSwgMSwgMSkpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IF9jb2xvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRUeXBlKCk6IFR5cGVPZkxpZ2h0IHtcclxuICAgICAgICAgICAgcmV0dXJuIDxUeXBlT2ZMaWdodD50aGlzLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcigpOiB2b2lkIHsvKiovIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEFtYmllbnQgbGlnaHQsIGNvbWluZyBmcm9tIGFsbCBkaXJlY3Rpb25zLCBpbGx1bWluYXRpbmcgZXZlcnl0aGluZyB3aXRoIGl0cyBjb2xvciBpbmRlcGVuZGVudCBvZiBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gKGxpa2UgYSBmb2dneSBkYXkgb3IgaW4gdGhlIHNoYWRlcykgIFxyXG4gICAgICogYGBgcGxhaW50ZXh0XHJcbiAgICAgKiB+IH4gfiAgXHJcbiAgICAgKiAgfiB+IH4gIFxyXG4gICAgICogYGBgXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBMaWdodEFtYmllbnQgZXh0ZW5kcyBMaWdodCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2NvbG9yOiBDb2xvciA9IG5ldyBDb2xvcigxLCAxLCAxLCAxKSkge1xyXG4gICAgICAgICAgICBzdXBlcihfY29sb3IpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogRGlyZWN0aW9uYWwgbGlnaHQsIGlsbHVtaW5hdGluZyBldmVyeXRoaW5nIGZyb20gYSBzcGVjaWZpZWQgZGlyZWN0aW9uIHdpdGggaXRzIGNvbG9yIChsaWtlIHN0YW5kaW5nIGluIGJyaWdodCBzdW5saWdodCkgIFxyXG4gICAgICogYGBgcGxhaW50ZXh0XHJcbiAgICAgKiAtLS0+ICBcclxuICAgICAqIC0tLT4gIFxyXG4gICAgICogLS0tPiAgXHJcbiAgICAgKiBgYGBcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIExpZ2h0RGlyZWN0aW9uYWwgZXh0ZW5kcyBMaWdodCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2NvbG9yOiBDb2xvciA9IG5ldyBDb2xvcigxLCAxLCAxLCAxKSkge1xyXG4gICAgICAgICAgICBzdXBlcihfY29sb3IpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogT21uaWRpcmVjdGlvbmFsIGxpZ2h0IGVtaXR0aW5nIGZyb20gaXRzIHBvc2l0aW9uLCBpbGx1bWluYXRpbmcgb2JqZWN0cyBkZXBlbmRpbmcgb24gdGhlaXIgcG9zaXRpb24gYW5kIGRpc3RhbmNlIHdpdGggaXRzIGNvbG9yIChsaWtlIGEgY29sb3JlZCBsaWdodCBidWxiKSAgXHJcbiAgICAgKiBgYGBwbGFpbnRleHRcclxuICAgICAqICAgICAgICAgLlxcfC8uXHJcbiAgICAgKiAgICAgICAgLS0gbyAtLVxyXG4gICAgICogICAgICAgICDCtC98XFxgXHJcbiAgICAgKiBgYGBcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIExpZ2h0UG9pbnQgZXh0ZW5kcyBMaWdodCB7XHJcbiAgICAgICAgcHVibGljIHJhbmdlOiBudW1iZXIgPSAxMDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogU3BvdCBsaWdodCBlbWl0dGluZyB3aXRoaW4gYSBzcGVjaWZpZWQgYW5nbGUgZnJvbSBpdHMgcG9zaXRpb24sIGlsbHVtaW5hdGluZyBvYmplY3RzIGRlcGVuZGluZyBvbiB0aGVpciBwb3NpdGlvbiBhbmQgZGlzdGFuY2Ugd2l0aCBpdHMgY29sb3IgIFxyXG4gICAgICogYGBgcGxhaW50ZXh0XHJcbiAgICAgKiAgICAgICAgICBvICBcclxuICAgICAqICAgICAgICAgL3xcXCAgXHJcbiAgICAgKiAgICAgICAgLyB8IFxcIFxyXG4gICAgICogYGBgICAgXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBMaWdodFNwb3QgZXh0ZW5kcyBMaWdodCB7XHJcbiAgICB9XHJcbn0iLCIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9MaWdodC9MaWdodC50c1wiLz5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEF0dGFjaGVzIGEgW1tMaWdodF1dIHRvIHRoZSBub2RlXHJcbiAgICAgKiBAYXV0aG9ycyBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIGlkZW50aWZpZXJzIGZvciB0aGUgdmFyaW91cyB0eXBlcyBvZiBsaWdodCB0aGlzIGNvbXBvbmVudCBjYW4gcHJvdmlkZS4gIFxyXG4gICAgICovXHJcbiAgICAvLyBleHBvcnQgZW51bSBMSUdIVF9UWVBFIHtcclxuICAgIC8vICAgICBBTUJJRU5UID0gXCJhbWJpZW50XCIsXHJcbiAgICAvLyAgICAgRElSRUNUSU9OQUwgPSBcImRpcmVjdGlvbmFsXCIsXHJcbiAgICAvLyAgICAgUE9JTlQgPSBcInBvaW50XCIsXHJcbiAgICAvLyAgICAgU1BPVCA9IFwic3BvdFwiXHJcbiAgICAvLyB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudExpZ2h0IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuICAgICAgICAvLyBwcml2YXRlIHN0YXRpYyBjb25zdHJ1Y3RvcnM6IHsgW3R5cGU6IHN0cmluZ106IEdlbmVyYWwgfSA9IHsgW0xJR0hUX1RZUEUuQU1CSUVOVF06IExpZ2h0QW1iaWVudCwgW0xJR0hUX1RZUEUuRElSRUNUSU9OQUxdOiBMaWdodERpcmVjdGlvbmFsLCBbTElHSFRfVFlQRS5QT0lOVF06IExpZ2h0UG9pbnQsIFtMSUdIVF9UWVBFLlNQT1RdOiBMaWdodFNwb3QgfTtcclxuICAgICAgICBwdWJsaWMgcGl2b3Q6IE1hdHJpeDR4NCA9IE1hdHJpeDR4NC5JREVOVElUWTtcclxuICAgICAgICBwdWJsaWMgbGlnaHQ6IExpZ2h0ID0gbnVsbDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2xpZ2h0OiBMaWdodCA9IG5ldyBMaWdodEFtYmllbnQoKSkge1xyXG4gICAgICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgICAgICB0aGlzLnNpbmdsZXRvbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmxpZ2h0ID0gX2xpZ2h0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFR5cGU8VCBleHRlbmRzIExpZ2h0PihfY2xhc3M6IG5ldyAoKSA9PiBUKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBtdHJPbGQ6IE11dGF0b3IgPSB7fTtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlnaHQpXHJcbiAgICAgICAgICAgICAgICBtdHJPbGQgPSB0aGlzLmxpZ2h0LmdldE11dGF0b3IoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubGlnaHQgPSBuZXcgX2NsYXNzKCk7XHJcbiAgICAgICAgICAgIHRoaXMubGlnaHQubXV0YXRlKG10ck9sZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBBdHRhY2hlcyBhIFtbTWF0ZXJpYWxdXSB0byB0aGUgbm9kZVxyXG4gICAgICogQGF1dGhvcnMgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudE1hdGVyaWFsIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuICAgICAgICBwdWJsaWMgbWF0ZXJpYWw6IE1hdGVyaWFsO1xyXG5cclxuICAgICAgICBwdWJsaWMgY29uc3RydWN0b3IoX21hdGVyaWFsOiBNYXRlcmlhbCA9IG51bGwpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5tYXRlcmlhbCA9IF9tYXRlcmlhbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxyXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XHJcbiAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uO1xyXG4gICAgICAgICAgICAvKiBhdCB0aGlzIHBvaW50IG9mIHRpbWUsIHNlcmlhbGl6YXRpb24gYXMgcmVzb3VyY2UgYW5kIGFzIGlubGluZSBvYmplY3QgaXMgcG9zc2libGUuIFRPRE86IGNoZWNrIGlmIGlubGluZSBiZWNvbWVzIG9ic29sZXRlICovXHJcbiAgICAgICAgICAgIGxldCBpZE1hdGVyaWFsOiBzdHJpbmcgPSB0aGlzLm1hdGVyaWFsLmlkUmVzb3VyY2U7XHJcbiAgICAgICAgICAgIGlmIChpZE1hdGVyaWFsKVxyXG4gICAgICAgICAgICAgICAgc2VyaWFsaXphdGlvbiA9IHsgaWRNYXRlcmlhbDogaWRNYXRlcmlhbCB9O1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBzZXJpYWxpemF0aW9uID0geyBtYXRlcmlhbDogU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5tYXRlcmlhbCkgfTtcclxuXHJcbiAgICAgICAgICAgIHNlcmlhbGl6YXRpb25bc3VwZXIuY29uc3RydWN0b3IubmFtZV0gPSBzdXBlci5zZXJpYWxpemUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XHJcbiAgICAgICAgICAgIGxldCBtYXRlcmlhbDogTWF0ZXJpYWw7XHJcbiAgICAgICAgICAgIGlmIChfc2VyaWFsaXphdGlvbi5pZE1hdGVyaWFsKVxyXG4gICAgICAgICAgICAgICAgbWF0ZXJpYWwgPSA8TWF0ZXJpYWw+UmVzb3VyY2VNYW5hZ2VyLmdldChfc2VyaWFsaXphdGlvbi5pZE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbWF0ZXJpYWwgPSA8TWF0ZXJpYWw+U2VyaWFsaXplci5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbi5tYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIHRoaXMubWF0ZXJpYWwgPSBtYXRlcmlhbDtcclxuICAgICAgICAgICAgc3VwZXIuZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb25bc3VwZXIuY29uc3RydWN0b3IubmFtZV0pO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIC8qKlxyXG4gICAgICogQXR0YWNoZXMgYSBbW01lc2hdXSB0byB0aGUgbm9kZVxyXG4gICAgICogQGF1dGhvcnMgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudE1lc2ggZXh0ZW5kcyBDb21wb25lbnQge1xyXG4gICAgICAgIHB1YmxpYyBwaXZvdDogTWF0cml4NHg0ID0gTWF0cml4NHg0LklERU5USVRZO1xyXG4gICAgICAgIHB1YmxpYyBtZXNoOiBNZXNoID0gbnVsbDtcclxuXHJcbiAgICAgICAgcHVibGljIGNvbnN0cnVjdG9yKF9tZXNoOiBNZXNoID0gbnVsbCkge1xyXG4gICAgICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgICAgICB0aGlzLm1lc2ggPSBfbWVzaDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxyXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XHJcbiAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uO1xyXG4gICAgICAgICAgICAvKiBhdCB0aGlzIHBvaW50IG9mIHRpbWUsIHNlcmlhbGl6YXRpb24gYXMgcmVzb3VyY2UgYW5kIGFzIGlubGluZSBvYmplY3QgaXMgcG9zc2libGUuIFRPRE86IGNoZWNrIGlmIGlubGluZSBiZWNvbWVzIG9ic29sZXRlICovXHJcbiAgICAgICAgICAgIGxldCBpZE1lc2g6IHN0cmluZyA9IHRoaXMubWVzaC5pZFJlc291cmNlO1xyXG4gICAgICAgICAgICBpZiAoaWRNZXNoKVxyXG4gICAgICAgICAgICAgICAgc2VyaWFsaXphdGlvbiA9IHsgaWRNZXNoOiBpZE1lc2ggfTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgc2VyaWFsaXphdGlvbiA9IHsgbWVzaDogU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5tZXNoKSB9O1xyXG5cclxuICAgICAgICAgICAgc2VyaWFsaXphdGlvbi5waXZvdCA9IHRoaXMucGl2b3Quc2VyaWFsaXplKCk7XHJcbiAgICAgICAgICAgIHNlcmlhbGl6YXRpb25bc3VwZXIuY29uc3RydWN0b3IubmFtZV0gPSBzdXBlci5zZXJpYWxpemUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICAgICAgICBsZXQgbWVzaDogTWVzaDtcclxuICAgICAgICAgICAgaWYgKF9zZXJpYWxpemF0aW9uLmlkTWVzaClcclxuICAgICAgICAgICAgICAgIG1lc2ggPSA8TWVzaD5SZXNvdXJjZU1hbmFnZXIuZ2V0KF9zZXJpYWxpemF0aW9uLmlkTWVzaCk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIG1lc2ggPSA8TWVzaD5TZXJpYWxpemVyLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uLm1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLm1lc2ggPSBtZXNoO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5waXZvdC5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbi5waXZvdCk7XHJcbiAgICAgICAgICAgIHN1cGVyLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uW3N1cGVyLmNvbnN0cnVjdG9yLm5hbWVdKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG59XHJcbiIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBCYXNlIGNsYXNzIGZvciBzY3JpcHRzIHRoZSB1c2VyIHdyaXRlc1xyXG4gICAgICogQGF1dGhvcnMgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudFNjcmlwdCBleHRlbmRzIENvbXBvbmVudCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2luZ2xldG9uID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRNdXRhdG9yKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICAgICAgICB0aGlzLm11dGF0ZShfc2VyaWFsaXphdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBBdHRhY2hlcyBhIHRyYW5zZm9ybS1bW01hdHJpeDR4NF1dIHRvIHRoZSBub2RlLCBtb3ZpbmcsIHNjYWxpbmcgYW5kIHJvdGF0aW5nIGl0IGluIHNwYWNlIHJlbGF0aXZlIHRvIGl0cyBwYXJlbnQuXHJcbiAgICAgKiBAYXV0aG9ycyBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQ29tcG9uZW50VHJhbnNmb3JtIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuICAgICAgICBwdWJsaWMgbG9jYWw6IE1hdHJpeDR4NDtcclxuXHJcbiAgICAgICAgcHVibGljIGNvbnN0cnVjdG9yKF9tYXRyaXg6IE1hdHJpeDR4NCA9IE1hdHJpeDR4NC5JREVOVElUWSkge1xyXG4gICAgICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvY2FsID0gX21hdHJpeDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxyXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XHJcbiAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgbG9jYWw6IHRoaXMubG9jYWwuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgICAgICBbc3VwZXIuY29uc3RydWN0b3IubmFtZV06IHN1cGVyLnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICAgICAgICBzdXBlci5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbltzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSk7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWwuZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb24ubG9jYWwpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHB1YmxpYyBtdXRhdGUoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgICAvLyAgICAgdGhpcy5sb2NhbC5tdXRhdGUoX211dGF0b3IpO1xyXG4gICAgICAgIC8vIH1cclxuICAgICAgICAvLyBwdWJsaWMgZ2V0TXV0YXRvcigpOiBNdXRhdG9yIHsgXHJcbiAgICAgICAgLy8gICAgIHJldHVybiB0aGlzLmxvY2FsLmdldE11dGF0b3IoKTtcclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIHB1YmxpYyBnZXRNdXRhdG9yQXR0cmlidXRlVHlwZXMoX211dGF0b3I6IE11dGF0b3IpOiBNdXRhdG9yQXR0cmlidXRlVHlwZXMge1xyXG4gICAgICAgIC8vICAgICBsZXQgdHlwZXM6IE11dGF0b3JBdHRyaWJ1dGVUeXBlcyA9IHRoaXMubG9jYWwuZ2V0TXV0YXRvckF0dHJpYnV0ZVR5cGVzKF9tdXRhdG9yKTtcclxuICAgICAgICAvLyAgICAgcmV0dXJuIHR5cGVzO1xyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgICAgICAgZGVsZXRlIF9tdXRhdG9yLndvcmxkO1xyXG4gICAgICAgICAgICBzdXBlci5yZWR1Y2VNdXRhdG9yKF9tdXRhdG9yKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcbiAgICB9XHJcbn1cclxuIiwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdBbGVydC50c1wiLz5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBmaWx0ZXJzIGNvcnJlc3BvbmRpbmcgdG8gZGVidWcgYWN0aXZpdGllcywgbW9yZSB0byBjb21lXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBlbnVtIERFQlVHX0ZJTFRFUiB7XHJcbiAgICAgICAgTk9ORSA9IDB4MDAsXHJcbiAgICAgICAgSU5GTyA9IDB4MDEsXHJcbiAgICAgICAgTE9HID0gMHgwMixcclxuICAgICAgICBXQVJOID0gMHgwNCxcclxuICAgICAgICBFUlJPUiA9IDB4MDgsXHJcbiAgICAgICAgQUxMID0gSU5GTyB8IExPRyB8IFdBUk4gfCBFUlJPUlxyXG4gICAgfVxyXG4gICAgLy8gcmVtaW5lc2NlbnQgb2YgYW4gZWFybHkgYXR0ZW1wdCBvZiBEZWJ1Z1xyXG4gICAgLy8gZXhwb3J0IGVudW0gREVCVUdfVEFSR0VUIHtcclxuICAgIC8vICAgICBDT05TT0xFID0gXCJjb25zb2xlXCIsXHJcbiAgICAvLyAgICAgQUxFUlQgPSBcImFsZXJ0XCIsXHJcbiAgICAvLyAgICAgVEVYVEFSRUEgPSBcInRleHRhcmVhXCIsXHJcbiAgICAvLyAgICAgRElBTE9HID0gXCJkaWFsb2dcIixcclxuICAgIC8vICAgICBGSUxFID0gXCJmaWxlXCIsXHJcbiAgICAvLyAgICAgU0VSVkVSID0gXCJzZXJ2ZXJcIlxyXG4gICAgLy8gfVxyXG5cclxuICAgIC8vIGV4cG9ydCBpbnRlcmZhY2UgTWFwRGVidWdUYXJnZXRUb0Z1bmN0aW9uIHsgW3RhcmdldDogc3RyaW5nXTogRnVuY3Rpb247IH1cclxuICAgIGV4cG9ydCB0eXBlIE1hcERlYnVnVGFyZ2V0VG9EZWxlZ2F0ZSA9IE1hcDxEZWJ1Z1RhcmdldCwgRnVuY3Rpb24+O1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBNYXBEZWJ1Z0ZpbHRlclRvRGVsZWdhdGUgeyBbZmlsdGVyOiBudW1iZXJdOiBGdW5jdGlvbjsgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEJhc2UgY2xhc3MgZm9yIHRoZSBkaWZmZXJlbnQgRGVidWdUYXJnZXRzLCBtYWlubHkgZm9yIHRlY2huaWNhbCBwdXJwb3NlIG9mIGluaGVyaXRhbmNlXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBEZWJ1Z1RhcmdldCB7XHJcbiAgICAgICAgcHVibGljIGRlbGVnYXRlczogTWFwRGVidWdGaWx0ZXJUb0RlbGVnYXRlO1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgbWVyZ2VBcmd1bWVudHMoX21lc3NhZ2U6IE9iamVjdCwgLi4uX2FyZ3M6IE9iamVjdFtdKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgbGV0IG91dDogc3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoX21lc3NhZ2UpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhcmcgb2YgX2FyZ3MpXHJcbiAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KGFyZywgbnVsbCwgMik7XHJcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkRlYnVnVGFyZ2V0LnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIC8qKlxyXG4gICAgICogUm91dGluZyB0byB0aGUgYWxlcnQgYm94XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBEZWJ1Z0FsZXJ0IGV4dGVuZHMgRGVidWdUYXJnZXQge1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZGVsZWdhdGVzOiBNYXBEZWJ1Z0ZpbHRlclRvRGVsZWdhdGUgPSB7XHJcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuSU5GT106IERlYnVnQWxlcnQuY3JlYXRlRGVsZWdhdGUoXCJJbmZvXCIpLFxyXG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLkxPR106IERlYnVnQWxlcnQuY3JlYXRlRGVsZWdhdGUoXCJMb2dcIiksXHJcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuV0FSTl06IERlYnVnQWxlcnQuY3JlYXRlRGVsZWdhdGUoXCJXYXJuXCIpLFxyXG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLkVSUk9SXTogRGVidWdBbGVydC5jcmVhdGVEZWxlZ2F0ZShcIkVycm9yXCIpXHJcbiAgICAgICAgfTtcclxuICAgICAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZURlbGVnYXRlKF9oZWFkbGluZTogc3RyaW5nKTogRnVuY3Rpb24ge1xyXG4gICAgICAgICAgICBsZXQgZGVsZWdhdGU6IEZ1bmN0aW9uID0gZnVuY3Rpb24gKF9tZXNzYWdlOiBPYmplY3QsIC4uLl9hcmdzOiBPYmplY3RbXSk6IHZvaWQge1xyXG4gICAgICAgICAgICAgICAgbGV0IG91dDogc3RyaW5nID0gX2hlYWRsaW5lICsgXCJcXG5cXG5cIiArIERlYnVnVGFyZ2V0Lm1lcmdlQXJndW1lbnRzKF9tZXNzYWdlLCAuLi5fYXJncyk7XHJcbiAgICAgICAgICAgICAgICBhbGVydChvdXQpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gZGVsZWdhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkRlYnVnVGFyZ2V0LnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIC8qKlxyXG4gICAgICogUm91dGluZyB0byB0aGUgc3RhbmRhcmQtY29uc29sZVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgRGVidWdDb25zb2xlIGV4dGVuZHMgRGVidWdUYXJnZXQge1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZGVsZWdhdGVzOiBNYXBEZWJ1Z0ZpbHRlclRvRGVsZWdhdGUgPSB7XHJcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuSU5GT106IGNvbnNvbGUuaW5mbyxcclxuICAgICAgICAgICAgW0RFQlVHX0ZJTFRFUi5MT0ddOiBjb25zb2xlLmxvZyxcclxuICAgICAgICAgICAgW0RFQlVHX0ZJTFRFUi5XQVJOXTogY29uc29sZS53YXJuLFxyXG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLkVSUk9SXTogY29uc29sZS5lcnJvclxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdJbnRlcmZhY2VzLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdBbGVydC50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkRlYnVnQ29uc29sZS50c1wiLz5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBEZWJ1Zy1DbGFzcyBvZmZlcnMgZnVuY3Rpb25zIGtub3duIGZyb20gdGhlIGNvbnNvbGUtb2JqZWN0IGFuZCBhZGRpdGlvbnMsIFxyXG4gICAgICogcm91dGluZyB0aGUgaW5mb3JtYXRpb24gdG8gdmFyaW91cyBbW0RlYnVnVGFyZ2V0c11dIHRoYXQgY2FuIGJlIGVhc2lseSBkZWZpbmVkIGJ5IHRoZSBkZXZlbG9wZXJzIGFuZCByZWdpc3RlcmQgYnkgdXNlcnNcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIERlYnVnIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBGb3IgZWFjaCBzZXQgZmlsdGVyLCB0aGlzIGFzc29jaWF0aXZlIGFycmF5IGtlZXBzIHJlZmVyZW5jZXMgdG8gdGhlIHJlZ2lzdGVyZWQgZGVsZWdhdGUgZnVuY3Rpb25zIG9mIHRoZSBjaG9zZW4gW1tEZWJ1Z1RhcmdldHNdXVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIC8vIFRPRE86IGltcGxlbWVudCBhbm9ueW1vdXMgZnVuY3Rpb24gc2V0dGluZyB1cCBhbGwgZmlsdGVyc1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGRlbGVnYXRlczogeyBbZmlsdGVyOiBudW1iZXJdOiBNYXBEZWJ1Z1RhcmdldFRvRGVsZWdhdGUgfSA9IHtcclxuICAgICAgICAgICAgW0RFQlVHX0ZJTFRFUi5JTkZPXTogbmV3IE1hcChbW0RlYnVnQ29uc29sZSwgRGVidWdDb25zb2xlLmRlbGVnYXRlc1tERUJVR19GSUxURVIuSU5GT11dXSksXHJcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuTE9HXTogbmV3IE1hcChbW0RlYnVnQ29uc29sZSwgRGVidWdDb25zb2xlLmRlbGVnYXRlc1tERUJVR19GSUxURVIuTE9HXV1dKSxcclxuICAgICAgICAgICAgW0RFQlVHX0ZJTFRFUi5XQVJOXTogbmV3IE1hcChbW0RlYnVnQ29uc29sZSwgRGVidWdDb25zb2xlLmRlbGVnYXRlc1tERUJVR19GSUxURVIuV0FSTl1dXSksXHJcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuRVJST1JdOiBuZXcgTWFwKFtbRGVidWdDb25zb2xlLCBEZWJ1Z0NvbnNvbGUuZGVsZWdhdGVzW0RFQlVHX0ZJTFRFUi5FUlJPUl1dXSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBEZS0gLyBBY3RpdmF0ZSBhIGZpbHRlciBmb3IgdGhlIGdpdmVuIERlYnVnVGFyZ2V0LiBcclxuICAgICAgICAgKiBAcGFyYW0gX3RhcmdldFxyXG4gICAgICAgICAqIEBwYXJhbSBfZmlsdGVyIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc2V0RmlsdGVyKF90YXJnZXQ6IERlYnVnVGFyZ2V0LCBfZmlsdGVyOiBERUJVR19GSUxURVIpOiB2b2lkIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgZmlsdGVyIGluIERlYnVnLmRlbGVnYXRlcylcclxuICAgICAgICAgICAgICAgIERlYnVnLmRlbGVnYXRlc1tmaWx0ZXJdLmRlbGV0ZShfdGFyZ2V0KTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGZpbHRlciBpbiBERUJVR19GSUxURVIpIHtcclxuICAgICAgICAgICAgICAgIGxldCBwYXJzZWQ6IG51bWJlciA9IHBhcnNlSW50KGZpbHRlcik7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VkID09IERFQlVHX0ZJTFRFUi5BTEwpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBpZiAoX2ZpbHRlciAmIHBhcnNlZClcclxuICAgICAgICAgICAgICAgICAgICBEZWJ1Zy5kZWxlZ2F0ZXNbcGFyc2VkXS5zZXQoX3RhcmdldCwgX3RhcmdldC5kZWxlZ2F0ZXNbcGFyc2VkXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERlYnVnIGZ1bmN0aW9uIHRvIGJlIGltcGxlbWVudGVkIGJ5IHRoZSBEZWJ1Z1RhcmdldC4gXHJcbiAgICAgICAgICogaW5mbyguLi4pIGRpc3BsYXlzIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gd2l0aCBsb3cgcHJpb3JpdHlcclxuICAgICAgICAgKiBAcGFyYW0gX21lc3NhZ2VcclxuICAgICAgICAgKiBAcGFyYW0gX2FyZ3MgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBpbmZvKF9tZXNzYWdlOiBPYmplY3QsIC4uLl9hcmdzOiBPYmplY3RbXSk6IHZvaWQge1xyXG4gICAgICAgICAgICBEZWJ1Zy5kZWxlZ2F0ZShERUJVR19GSUxURVIuSU5GTywgX21lc3NhZ2UsIF9hcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRGVidWcgZnVuY3Rpb24gdG8gYmUgaW1wbGVtZW50ZWQgYnkgdGhlIERlYnVnVGFyZ2V0LiBcclxuICAgICAgICAgKiBsb2coLi4uKSBkaXNwbGF5cyBpbmZvcm1hdGlvbiB3aXRoIG1lZGl1bSBwcmlvcml0eVxyXG4gICAgICAgICAqIEBwYXJhbSBfbWVzc2FnZVxyXG4gICAgICAgICAqIEBwYXJhbSBfYXJncyBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGxvZyhfbWVzc2FnZTogT2JqZWN0LCAuLi5fYXJnczogT2JqZWN0W10pOiB2b2lkIHtcclxuICAgICAgICAgICAgRGVidWcuZGVsZWdhdGUoREVCVUdfRklMVEVSLkxPRywgX21lc3NhZ2UsIF9hcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRGVidWcgZnVuY3Rpb24gdG8gYmUgaW1wbGVtZW50ZWQgYnkgdGhlIERlYnVnVGFyZ2V0LiBcclxuICAgICAgICAgKiB3YXJuKC4uLikgZGlzcGxheXMgaW5mb3JtYXRpb24gYWJvdXQgbm9uLWNvbmZvcm1pdGllcyBpbiB1c2FnZSwgd2hpY2ggaXMgZW1waGFzaXplZCBlLmcuIGJ5IGNvbG9yXHJcbiAgICAgICAgICogQHBhcmFtIF9tZXNzYWdlXHJcbiAgICAgICAgICogQHBhcmFtIF9hcmdzIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgd2FybihfbWVzc2FnZTogT2JqZWN0LCAuLi5fYXJnczogT2JqZWN0W10pOiB2b2lkIHtcclxuICAgICAgICAgICAgRGVidWcuZGVsZWdhdGUoREVCVUdfRklMVEVSLldBUk4sIF9tZXNzYWdlLCBfYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERlYnVnIGZ1bmN0aW9uIHRvIGJlIGltcGxlbWVudGVkIGJ5IHRoZSBEZWJ1Z1RhcmdldC4gXHJcbiAgICAgICAgICogZXJyb3IoLi4uKSBkaXNwbGF5cyBjcml0aWNhbCBpbmZvcm1hdGlvbiBhYm91dCBmYWlsdXJlcywgd2hpY2ggaXMgZW1waGFzaXplZCBlLmcuIGJ5IGNvbG9yXHJcbiAgICAgICAgICogQHBhcmFtIF9tZXNzYWdlXHJcbiAgICAgICAgICogQHBhcmFtIF9hcmdzIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZXJyb3IoX21lc3NhZ2U6IE9iamVjdCwgLi4uX2FyZ3M6IE9iamVjdFtdKTogdm9pZCB7XHJcbiAgICAgICAgICAgIERlYnVnLmRlbGVnYXRlKERFQlVHX0ZJTFRFUi5FUlJPUiwgX21lc3NhZ2UsIF9hcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogTG9va3VwIGFsbCBkZWxlZ2F0ZXMgcmVnaXN0ZXJlZCB0byB0aGUgZmlsdGVyIGFuZCBjYWxsIHRoZW0gdXNpbmcgdGhlIGdpdmVuIGFyZ3VtZW50c1xyXG4gICAgICAgICAqIEBwYXJhbSBfZmlsdGVyIFxyXG4gICAgICAgICAqIEBwYXJhbSBfbWVzc2FnZSBcclxuICAgICAgICAgKiBAcGFyYW0gX2FyZ3MgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZGVsZWdhdGUoX2ZpbHRlcjogREVCVUdfRklMVEVSLCBfbWVzc2FnZTogT2JqZWN0LCBfYXJnczogT2JqZWN0W10pOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGRlbGVnYXRlczogTWFwRGVidWdUYXJnZXRUb0RlbGVnYXRlID0gRGVidWcuZGVsZWdhdGVzW19maWx0ZXJdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBkZWxlZ2F0ZSBvZiBkZWxlZ2F0ZXMudmFsdWVzKCkpXHJcbiAgICAgICAgICAgICAgICBpZiAoX2FyZ3MubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgICAgICBkZWxlZ2F0ZShfbWVzc2FnZSwgLi4uX2FyZ3MpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGRlbGVnYXRlKF9tZXNzYWdlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdUYXJnZXQudHNcIi8+XHJcbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBSb3V0aW5nIHRvIGEgSFRNTERpYWxvZ0VsZW1lbnRcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIERlYnVnRGlhbG9nIGV4dGVuZHMgRGVidWdUYXJnZXQge1xyXG4gICAgICAgIC8vIFRPRE86IGNoZWNrb3V0IEhUTUxEaWFsb2dFbGVtZW50OyAhISFcclxuICAgIH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJEZWJ1Z1RhcmdldC50c1wiLz5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIFJvdXRlIHRvIGFuIEhUTUxUZXh0QXJlYSwgbWF5IGJlIG9ic29sZXRlIHdoZW4gdXNpbmcgSFRNTERpYWxvZ0VsZW1lbnRcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIERlYnVnVGV4dEFyZWEgZXh0ZW5kcyBEZWJ1Z1RhcmdldCB7XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyB0ZXh0QXJlYTogSFRNTFRleHRBcmVhRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcclxuICAgICAgICBwdWJsaWMgc3RhdGljIGRlbGVnYXRlczogTWFwRGVidWdGaWx0ZXJUb0RlbGVnYXRlID0ge1xyXG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLklORk9dOiBEZWJ1Z0FsZXJ0LmNyZWF0ZURlbGVnYXRlKFwiSW5mb1wiKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBjcmVhdGVEZWxlZ2F0ZShfaGVhZGxpbmU6IHN0cmluZyk6IEZ1bmN0aW9uIHtcclxuICAgICAgICAgICAgbGV0IGRlbGVnYXRlOiBGdW5jdGlvbiA9IGZ1bmN0aW9uIChfbWVzc2FnZTogT2JqZWN0LCAuLi5fYXJnczogT2JqZWN0W10pOiB2b2lkIHtcclxuICAgICAgICAgICAgICAgIGxldCBvdXQ6IHN0cmluZyA9IF9oZWFkbGluZSArIFwiXFxuXFxuXCIgKyBEZWJ1Z1RhcmdldC5tZXJnZUFyZ3VtZW50cyhfbWVzc2FnZSwgX2FyZ3MpO1xyXG4gICAgICAgICAgICAgICAgRGVidWdUZXh0QXJlYS50ZXh0QXJlYS50ZXh0Q29udGVudCArPSBvdXQ7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBkZWxlZ2F0ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIGV4cG9ydCBlbnVtIENPTE9SIHtcclxuICAgICAgICBCTEFDSyxcclxuICAgICAgICBXSElURSxcclxuXHJcbiAgICAgICAgUkVELFxyXG4gICAgICAgIEdSRUVOLFxyXG4gICAgICAgIEJMVUUsXHJcbiAgICAgICAgWUVMTE9XLFxyXG4gICAgICAgIENZQU4sXHJcbiAgICAgICAgTUFHRU5UQSxcclxuXHJcbiAgICAgICAgTElHSFRfR1JFWSxcclxuICAgICAgICBMSUdIVF9SRUQsXHJcbiAgICAgICAgTElHSFRfR1JFRU4sXHJcbiAgICAgICAgTElHSFRfQkxVRSxcclxuICAgICAgICBMSUdIVF9ZRUxMT1csXHJcbiAgICAgICAgTElHSFRfQ1lBTixcclxuICAgICAgICBMSUdIVF9NQUdFTlRBLFxyXG5cclxuICAgICAgICBEQVJLX0dSRVksXHJcbiAgICAgICAgREFSS19SRUQsXHJcbiAgICAgICAgREFSS19HUkVFTixcclxuICAgICAgICBEQVJLX0JMVUUsXHJcbiAgICAgICAgREFSS19ZRUxMT1csXHJcbiAgICAgICAgREFSS19DWUFOLFxyXG4gICAgICAgIERBUktfTUFHRU5UQVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGVmaW5lcyBhIGNvbG9yIGFzIHZhbHVlcyBpbiB0aGUgcmFuZ2Ugb2YgMCB0byAxIGZvciB0aGUgZm91ciBjaGFubmVscyByZWQsIGdyZWVuLCBibHVlIGFuZCBhbHBoYSAoZm9yIG9wYWNpdHkpXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBDb2xvciBleHRlbmRzIE11dGFibGUgeyAvL2ltcGxlbWVudHMgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBwdWJsaWMgcjogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBnOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGI6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgYTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcjogbnVtYmVyID0gMSwgX2c6IG51bWJlciA9IDEsIF9iOiBudW1iZXIgPSAxLCBfYTogbnVtYmVyID0gMSkge1xyXG4gICAgICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgICAgICB0aGlzLnNldE5vcm1SR0JBKF9yLCBfZywgX2IsIF9hKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IEJMQUNLKCk6IENvbG9yIHsgcmV0dXJuIG5ldyBDb2xvcigwLCAwLCAwLCAxKTsgfVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IFdISVRFKCk6IENvbG9yIHsgcmV0dXJuIG5ldyBDb2xvcigxLCAxLCAxLCAxKTsgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldCBSRUQoKTogQ29sb3IgeyByZXR1cm4gbmV3IENvbG9yKDEsIDAsIDAsIDEpOyB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgR1JFRU4oKTogQ29sb3IgeyByZXR1cm4gbmV3IENvbG9yKDAsIDEsIDAsIDEpOyB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgQkxVRSgpOiBDb2xvciB7IHJldHVybiBuZXcgQ29sb3IoMCwgMCwgMSwgMSk7IH1cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldCBZRUxMT1coKTogQ29sb3IgeyByZXR1cm4gbmV3IENvbG9yKDEsIDEsIDAsIDEpOyB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgQ1lBTigpOiBDb2xvciB7IHJldHVybiBuZXcgQ29sb3IoMCwgMSwgMSwgMSk7IH1cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldCBNQUdFTlRBKCk6IENvbG9yIHsgcmV0dXJuIG5ldyBDb2xvcigxLCAwLCAxLCAxKTsgfVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IEdSRVkoKTogQ29sb3IgeyByZXR1cm4gbmV3IENvbG9yKDAuNSwgMC41LCAwLjUsIDEpOyB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IExJR0hUX0dSRVkoKTogQ29sb3IgeyByZXR1cm4gbmV3IENvbG9yKDAuNzUsIDAuNzUsIDAuNzUsIDEpOyB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgTElHSFRfUkVEKCk6IENvbG9yIHsgcmV0dXJuIG5ldyBDb2xvcigxLCAwLjUsIDAuNSwgMSk7IH1cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldCBMSUdIVF9HUkVFTigpOiBDb2xvciB7IHJldHVybiBuZXcgQ29sb3IoMC41LCAxLCAwLjUsIDEpOyB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgTElHSFRfQkxVRSgpOiBDb2xvciB7IHJldHVybiBuZXcgQ29sb3IoMC41LCAwLjUsIDEsIDEpOyB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgTElHSFRfWUVMTE9XKCk6IENvbG9yIHsgcmV0dXJuIG5ldyBDb2xvcigxLCAxLCAwLjUsIDEpOyB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgTElHSFRfQ1lBTigpOiBDb2xvciB7IHJldHVybiBuZXcgQ29sb3IoMC41LCAxLCAxLCAxKTsgfVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IExJR0hUX01BR0VOVEEoKTogQ29sb3IgeyByZXR1cm4gbmV3IENvbG9yKDEsIDAuNSwgMSwgMSk7IH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgREFSS19HUkVZKCk6IENvbG9yIHsgcmV0dXJuIG5ldyBDb2xvcigwLjI1LCAwLjI1LCAwLjI1LCAxKTsgfVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IERBUktfUkVEKCk6IENvbG9yIHsgcmV0dXJuIG5ldyBDb2xvcigwLjUsIDAsIDAsIDEpOyB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgREFSS19HUkVFTigpOiBDb2xvciB7IHJldHVybiBuZXcgQ29sb3IoMCwgMC41LCAwLCAxKTsgfVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IERBUktfQkxVRSgpOiBDb2xvciB7IHJldHVybiBuZXcgQ29sb3IoMCwgMCwgMC41LCAxKTsgfVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IERBUktfWUVMTE9XKCk6IENvbG9yIHsgcmV0dXJuIG5ldyBDb2xvcigwLjUsIDAuNSwgMCwgMSk7IH1cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldCBEQVJLX0NZQU4oKTogQ29sb3IgeyByZXR1cm4gbmV3IENvbG9yKDAsIDAuNSwgMC41LCAxKTsgfVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IERBUktfTUFHRU5UQSgpOiBDb2xvciB7IHJldHVybiBuZXcgQ29sb3IoMC41LCAwLCAwLjUsIDEpOyB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgUFJFU0VUKF9jb2xvcjogQ09MT1IpOiBDb2xvciB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IHJlcGxhY2UgYWJvdmUgZ2V0dGVycyB3aXRoIHN3aXRjaCBoZXJlLi4uIFJlYXNvbjogaXQncyBtb3JlIGxpa2UgYW4gZW51bSBhbmQgc2hvdWxkIGJlIGRvY3VtZW50ZWQgYXMgc3VjaFxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IENvbG9yKDEsIDEsIDEsIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldE5vcm1SR0JBKF9yOiBudW1iZXIsIF9nOiBudW1iZXIsIF9iOiBudW1iZXIsIF9hOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5yID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgX3IpKTtcclxuICAgICAgICAgICAgdGhpcy5nID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgX2cpKTtcclxuICAgICAgICAgICAgdGhpcy5iID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgX2IpKTtcclxuICAgICAgICAgICAgdGhpcy5hID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgX2EpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRCeXRlc1JHQkEoX3I6IG51bWJlciwgX2c6IG51bWJlciwgX2I6IG51bWJlciwgX2E6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnNldE5vcm1SR0JBKF9yIC8gMjU1LCBfZyAvIDI1NSwgX2IgLyAyNTUsIF9hIC8gMjU1KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRBcnJheSgpOiBGbG9hdDMyQXJyYXkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEZsb2F0MzJBcnJheShbdGhpcy5yLCB0aGlzLmcsIHRoaXMuYiwgdGhpcy5hXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0QXJyYXlOb3JtUkdCQShfY29sb3I6IEZsb2F0MzJBcnJheSk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnNldE5vcm1SR0JBKF9jb2xvclswXSwgX2NvbG9yWzFdLCBfY29sb3JbMl0sIF9jb2xvclszXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0QXJyYXlCeXRlc1JHQkEoX2NvbG9yOiBVaW50OENsYW1wZWRBcnJheSk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnNldEJ5dGVzUkdCQShfY29sb3JbMF0sIF9jb2xvclsxXSwgX2NvbG9yWzJdLCBfY29sb3JbM10pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGFkZChfY29sb3I6IENvbG9yKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuciArPSBfY29sb3IucjtcclxuICAgICAgICAgICAgdGhpcy5nICs9IF9jb2xvci5nO1xyXG4gICAgICAgICAgICB0aGlzLmIgKz0gX2NvbG9yLmI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQgey8qKiAqLyB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIC8qKlxyXG4gICAgICogQmFzZWNsYXNzIGZvciBtYXRlcmlhbHMuIENvbWJpbmVzIGEgW1tTaGFkZXJdXSB3aXRoIGEgY29tcGF0aWJsZSBbW0NvYXRdXVxyXG4gICAgICogQGF1dGhvcnMgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIE1hdGVyaWFsIGltcGxlbWVudHMgU2VyaWFsaXphYmxlUmVzb3VyY2Uge1xyXG4gICAgICAgIC8qKiBUaGUgbmFtZSB0byBjYWxsIHRoZSBNYXRlcmlhbCBieS4gKi9cclxuICAgICAgICBwdWJsaWMgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBpZFJlc291cmNlOiBzdHJpbmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBzaGFkZXJUeXBlOiB0eXBlb2YgU2hhZGVyOyAvLyBUaGUgc2hhZGVyIHByb2dyYW0gdXNlZCBieSB0aGlzIEJhc2VNYXRlcmlhbFxyXG4gICAgICAgIHByaXZhdGUgY29hdDogQ29hdDtcclxuXHJcbiAgICAgICAgcHVibGljIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9zaGFkZXI/OiB0eXBlb2YgU2hhZGVyLCBfY29hdD86IENvYXQpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lID0gX25hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZGVyVHlwZSA9IF9zaGFkZXI7XHJcbiAgICAgICAgICAgIGlmIChfc2hhZGVyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX2NvYXQpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRDb2F0KF9jb2F0KTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldENvYXQodGhpcy5jcmVhdGVDb2F0TWF0Y2hpbmdTaGFkZXIoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZXMgYSBuZXcgW1tDb2F0XV0gaW5zdGFuY2UgdGhhdCBpcyB2YWxpZCBmb3IgdGhlIFtbU2hhZGVyXV0gcmVmZXJlbmNlZCBieSB0aGlzIG1hdGVyaWFsXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGNyZWF0ZUNvYXRNYXRjaGluZ1NoYWRlcigpOiBDb2F0IHtcclxuICAgICAgICAgICAgbGV0IGNvYXQ6IENvYXQgPSBuZXcgKHRoaXMuc2hhZGVyVHlwZS5nZXRDb2F0KCkpKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBjb2F0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogTWFrZXMgdGhpcyBtYXRlcmlhbCByZWZlcmVuY2UgdGhlIGdpdmVuIFtbQ29hdF1dIGlmIGl0IGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgcmVmZXJlbmNlZCBbW1NoYWRlcl1dXHJcbiAgICAgICAgICogQHBhcmFtIF9jb2F0IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzZXRDb2F0KF9jb2F0OiBDb2F0KTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmIChfY29hdC5jb25zdHJ1Y3RvciAhPSB0aGlzLnNoYWRlclR5cGUuZ2V0Q29hdCgpKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgKG5ldyBFcnJvcihcIlNoYWRlciBhbmQgY29hdCBkb24ndCBtYXRjaFwiKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29hdCA9IF9jb2F0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0dXJucyB0aGUgY3VycmVudGx5IHJlZmVyZW5jZWQgW1tDb2F0XV0gaW5zdGFuY2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0Q29hdCgpOiBDb2F0IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29hdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENoYW5nZXMgdGhlIG1hdGVyaWFscyByZWZlcmVuY2UgdG8gdGhlIGdpdmVuIFtbU2hhZGVyXV0sIGNyZWF0ZXMgYW5kIHJlZmVyZW5jZXMgYSBuZXcgW1tDb2F0XV0gaW5zdGFuY2UgIFxyXG4gICAgICAgICAqIGFuZCBtdXRhdGVzIHRoZSBuZXcgY29hdCB0byBwcmVzZXJ2ZSBtYXRjaGluZyBwcm9wZXJ0aWVzLlxyXG4gICAgICAgICAqIEBwYXJhbSBfc2hhZGVyVHlwZSBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0U2hhZGVyKF9zaGFkZXJUeXBlOiB0eXBlb2YgU2hhZGVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZGVyVHlwZSA9IF9zaGFkZXJUeXBlO1xyXG4gICAgICAgICAgICBsZXQgY29hdDogQ29hdCA9IHRoaXMuY3JlYXRlQ29hdE1hdGNoaW5nU2hhZGVyKCk7XHJcbiAgICAgICAgICAgIGNvYXQubXV0YXRlKHRoaXMuY29hdC5nZXRNdXRhdG9yKCkpO1xyXG4gICAgICAgICAgICB0aGlzLnNldENvYXQoY29hdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm5zIHRoZSBbW1NoYWRlcl1dIHJlZmVyZW5jZWQgYnkgdGhpcyBtYXRlcmlhbFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBnZXRTaGFkZXIoKTogdHlwZW9mIFNoYWRlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNoYWRlclR5cGU7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIFRyYW5zZmVyXHJcbiAgICAgICAgLy8gVE9ETzogdGhpcyB0eXBlIG9mIHNlcmlhbGl6YXRpb24gd2FzIGltcGxlbWVudGVkIGZvciBpbXBsaWNpdCBNYXRlcmlhbCBjcmVhdGUuIENoZWNrIGlmIG9ic29sZXRlIHdoZW4gb25seSBvbmUgbWF0ZXJpYWwgY2xhc3MgZXhpc3RzIGFuZC9vciBtYXRlcmlhbHMgYXJlIHN0b3JlZCBzZXBhcmF0ZWx5XHJcbiAgICAgICAgcHVibGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXHJcbiAgICAgICAgICAgICAgICBpZFJlc291cmNlOiB0aGlzLmlkUmVzb3VyY2UsXHJcbiAgICAgICAgICAgICAgICBzaGFkZXI6IHRoaXMuc2hhZGVyVHlwZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgY29hdDogU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5jb2F0KVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lID0gX3NlcmlhbGl6YXRpb24ubmFtZTtcclxuICAgICAgICAgICAgdGhpcy5pZFJlc291cmNlID0gX3NlcmlhbGl6YXRpb24uaWRSZXNvdXJjZTtcclxuICAgICAgICAgICAgLy8gVE9ETzogcHJvdmlkZSBmb3Igc2hhZGVycyBpbiB0aGUgdXNlcnMgbmFtZXNwYWNlLiBTZWUgU2VyaWFsaXplciBmdWxscGF0aCBldGMuXHJcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tYW55XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZGVyVHlwZSA9ICg8YW55PkZ1ZGdlQ29yZSlbX3NlcmlhbGl6YXRpb24uc2hhZGVyXTtcclxuICAgICAgICAgICAgbGV0IGNvYXQ6IENvYXQgPSA8Q29hdD5TZXJpYWxpemVyLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uLmNvYXQpO1xyXG4gICAgICAgICAgICB0aGlzLnNldENvYXQoY29hdCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBLZWVwcyBhIGRlcG90IG9mIG9iamVjdHMgdGhhdCBoYXZlIGJlZW4gbWFya2VkIGZvciByZXVzZSwgc29ydGVkIGJ5IHR5cGUuICBcclxuICAgICAqIFVzaW5nIFtbUmVjeWNsZXJdXSByZWR1Y2VzIGxvYWQgb24gdGhlIGNhcmJhZ2UgY29sbGVjdG9yIGFuZCB0aHVzIHN1cHBvcnRzIHNtb290aCBwZXJmb3JtYW5jZVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVjeWNsZXIge1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGRlcG90OiB7IFt0eXBlOiBzdHJpbmddOiBPYmplY3RbXSB9ID0ge307XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgYW4gb2JqZWN0IG9mIHRoZSByZXF1ZXN0ZWQgdHlwZSBmcm9tIHRoZSBkZXBvdCwgb3IgYSBuZXcgb25lLCBpZiB0aGUgZGVwb3Qgd2FzIGVtcHR5IFxyXG4gICAgICAgICAqIEBwYXJhbSBfVCBUaGUgY2xhc3MgaWRlbnRpZmllciBvZiB0aGUgZGVzaXJlZCBvYmplY3RcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldDxUPihfVDogbmV3ICgpID0+IFQpOiBUIHtcclxuICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX1QubmFtZTtcclxuICAgICAgICAgICAgbGV0IGluc3RhbmNlczogT2JqZWN0W10gPSBSZWN5Y2xlci5kZXBvdFtrZXldO1xyXG4gICAgICAgICAgICBpZiAoaW5zdGFuY2VzICYmIGluc3RhbmNlcy5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIDxUPmluc3RhbmNlcy5wb3AoKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBfVCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU3RvcmVzIHRoZSBvYmplY3QgaW4gdGhlIGRlcG90IGZvciBsYXRlciByZWN5Y2xpbmcuIFVzZXJzIGFyZSByZXNwb25zaWJsZSBmb3IgdGhyb3dpbmcgaW4gb2JqZWN0cyB0aGF0IGFyZSBhYm91dCB0byBsb29zZSBzY29wZSBhbmQgYXJlIG5vdCByZWZlcmVuY2VkIGJ5IGFueSBvdGhlclxyXG4gICAgICAgICAqIEBwYXJhbSBfaW5zdGFuY2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIHN0b3JlKF9pbnN0YW5jZTogT2JqZWN0KTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9pbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lO1xyXG4gICAgICAgICAgICAvL0RlYnVnLmxvZyhrZXkpO1xyXG4gICAgICAgICAgICBsZXQgaW5zdGFuY2VzOiBPYmplY3RbXSA9IFJlY3ljbGVyLmRlcG90W2tleV0gfHwgW107XHJcbiAgICAgICAgICAgIGluc3RhbmNlcy5wdXNoKF9pbnN0YW5jZSk7XHJcbiAgICAgICAgICAgIFJlY3ljbGVyLmRlcG90W2tleV0gPSBpbnN0YW5jZXM7XHJcbiAgICAgICAgICAgIC8vIERlYnVnLmxvZyhgT2JqZWN0TWFuYWdlci5kZXBvdFske2tleX1dOiAke09iamVjdE1hbmFnZXIuZGVwb3Rba2V5XS5sZW5ndGh9YCk7XHJcbiAgICAgICAgICAgIC8vRGVidWcubG9nKHRoaXMuZGVwb3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRW1wdHlzIHRoZSBkZXBvdCBvZiBhIGdpdmVuIHR5cGUsIGxlYXZpbmcgdGhlIG9iamVjdHMgZm9yIHRoZSBnYXJiYWdlIGNvbGxlY3Rvci4gTWF5IHJlc3VsdCBpbiBhIHNob3J0IHN0YWxsIHdoZW4gbWFueSBvYmplY3RzIHdlcmUgaW5cclxuICAgICAgICAgKiBAcGFyYW0gX1RcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGR1bXA8VD4oX1Q6IG5ldyAoKSA9PiBUKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9ULm5hbWU7XHJcbiAgICAgICAgICAgIFJlY3ljbGVyLmRlcG90W2tleV0gPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEVtcHR5cyBhbGwgZGVwb3RzLCBsZWF2aW5nIGFsbCBvYmplY3RzIHRvIHRoZSBnYXJiYWdlIGNvbGxlY3Rvci4gTWF5IHJlc3VsdCBpbiBhIHNob3J0IHN0YWxsIHdoZW4gbWFueSBvYmplY3RzIHdlcmUgaW5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGR1bXBBbGwoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIFJlY3ljbGVyLmRlcG90ID0ge307XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6YWJsZVJlc291cmNlIGV4dGVuZHMgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBpZFJlc291cmNlOiBzdHJpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBSZXNvdXJjZXMge1xyXG4gICAgICAgIFtpZFJlc291cmNlOiBzdHJpbmddOiBTZXJpYWxpemFibGVSZXNvdXJjZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6YXRpb25PZlJlc291cmNlcyB7XHJcbiAgICAgICAgW2lkUmVzb3VyY2U6IHN0cmluZ106IFNlcmlhbGl6YXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTdGF0aWMgY2xhc3MgaGFuZGxpbmcgdGhlIHJlc291cmNlcyB1c2VkIHdpdGggdGhlIGN1cnJlbnQgRlVER0UtaW5zdGFuY2UuICBcclxuICAgICAqIEtlZXBzIGEgbGlzdCBvZiB0aGUgcmVzb3VyY2VzIGFuZCBnZW5lcmF0ZXMgaWRzIHRvIHJldHJpZXZlIHRoZW0uICBcclxuICAgICAqIFJlc291cmNlcyBhcmUgb2JqZWN0cyByZWZlcmVuY2VkIG11bHRpcGxlIHRpbWVzIGJ1dCBzdXBwb3NlZCB0byBiZSBzdG9yZWQgb25seSBvbmNlXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZXNvdXJjZU1hbmFnZXIge1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgcmVzb3VyY2VzOiBSZXNvdXJjZXMgPSB7fTtcclxuICAgICAgICBwdWJsaWMgc3RhdGljIHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb25PZlJlc291cmNlcyA9IG51bGw7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEdlbmVyYXRlcyBhbiBpZCBmb3IgdGhlIHJlc291cmNlcyBhbmQgcmVnaXN0ZXJzIGl0IHdpdGggdGhlIGxpc3Qgb2YgcmVzb3VyY2VzIFxyXG4gICAgICAgICAqIEBwYXJhbSBfcmVzb3VyY2UgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyByZWdpc3RlcihfcmVzb3VyY2U6IFNlcmlhbGl6YWJsZVJlc291cmNlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICghX3Jlc291cmNlLmlkUmVzb3VyY2UpXHJcbiAgICAgICAgICAgICAgICBfcmVzb3VyY2UuaWRSZXNvdXJjZSA9IFJlc291cmNlTWFuYWdlci5nZW5lcmF0ZUlkKF9yZXNvdXJjZSk7XHJcbiAgICAgICAgICAgIFJlc291cmNlTWFuYWdlci5yZXNvdXJjZXNbX3Jlc291cmNlLmlkUmVzb3VyY2VdID0gX3Jlc291cmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogR2VuZXJhdGUgYSB1c2VyIHJlYWRhYmxlIGFuZCB1bmlxdWUgaWQgdXNpbmcgdGhlIHR5cGUgb2YgdGhlIHJlc291cmNlLCB0aGUgZGF0ZSBhbmQgcmFuZG9tIG51bWJlcnNcclxuICAgICAgICAgKiBAcGFyYW0gX3Jlc291cmNlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZW5lcmF0ZUlkKF9yZXNvdXJjZTogU2VyaWFsaXphYmxlUmVzb3VyY2UpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBidWlsZCBpZCBhbmQgaW50ZWdyYXRlIGluZm8gZnJvbSByZXNvdXJjZSwgbm90IGp1c3QgZGF0ZVxyXG4gICAgICAgICAgICBsZXQgaWRSZXNvdXJjZTogc3RyaW5nO1xyXG4gICAgICAgICAgICBkb1xyXG4gICAgICAgICAgICAgICAgaWRSZXNvdXJjZSA9IF9yZXNvdXJjZS5jb25zdHJ1Y3Rvci5uYW1lICsgXCJ8XCIgKyBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgKyBcInxcIiArIE1hdGgucmFuZG9tKCkudG9QcmVjaXNpb24oNSkuc3Vic3RyKDIsIDUpO1xyXG4gICAgICAgICAgICB3aGlsZSAoUmVzb3VyY2VNYW5hZ2VyLnJlc291cmNlc1tpZFJlc291cmNlXSk7XHJcbiAgICAgICAgICAgIHJldHVybiBpZFJlc291cmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVGVzdHMsIGlmIGFuIG9iamVjdCBpcyBhIFtbU2VyaWFsaXphYmxlUmVzb3VyY2VdXVxyXG4gICAgICAgICAqIEBwYXJhbSBfb2JqZWN0IFRoZSBvYmplY3QgdG8gZXhhbWluZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgaXNSZXNvdXJjZShfb2JqZWN0OiBTZXJpYWxpemFibGUpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIChSZWZsZWN0Lmhhcyhfb2JqZWN0LCBcImlkUmVzb3VyY2VcIikpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmVzIHRoZSByZXNvdXJjZSBzdG9yZWQgd2l0aCB0aGUgZ2l2ZW4gaWRcclxuICAgICAgICAgKiBAcGFyYW0gX2lkUmVzb3VyY2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldChfaWRSZXNvdXJjZTogc3RyaW5nKTogU2VyaWFsaXphYmxlUmVzb3VyY2Uge1xyXG4gICAgICAgICAgICBsZXQgcmVzb3VyY2U6IFNlcmlhbGl6YWJsZVJlc291cmNlID0gUmVzb3VyY2VNYW5hZ2VyLnJlc291cmNlc1tfaWRSZXNvdXJjZV07XHJcbiAgICAgICAgICAgIGlmICghcmVzb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uID0gUmVzb3VyY2VNYW5hZ2VyLnNlcmlhbGl6YXRpb25bX2lkUmVzb3VyY2VdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFzZXJpYWxpemF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoXCJSZXNvdXJjZSBub3QgZm91bmRcIiwgX2lkUmVzb3VyY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2UgPSBSZXNvdXJjZU1hbmFnZXIuZGVzZXJpYWxpemVSZXNvdXJjZShzZXJpYWxpemF0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzb3VyY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDcmVhdGVzIGFuZCByZWdpc3RlcnMgYSByZXNvdXJjZSBmcm9tIGEgW1tOb2RlXV0sIGNvcHlpbmcgdGhlIGNvbXBsZXRlIGJyYW5jaCBzdGFydGluZyB3aXRoIGl0XHJcbiAgICAgICAgICogQHBhcmFtIF9ub2RlIEEgbm9kZSB0byBjcmVhdGUgdGhlIHJlc291cmNlIGZyb21cclxuICAgICAgICAgKiBAcGFyYW0gX3JlcGxhY2VXaXRoSW5zdGFuY2UgaWYgdHJ1ZSAoZGVmYXVsdCksIHRoZSBub2RlIHVzZWQgYXMgb3JpZ2luIGlzIHJlcGxhY2VkIGJ5IGEgW1tOb2RlUmVzb3VyY2VJbnN0YW5jZV1dIG9mIHRoZSBbW05vZGVSZXNvdXJjZV1dIGNyZWF0ZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIHJlZ2lzdGVyTm9kZUFzUmVzb3VyY2UoX25vZGU6IE5vZGUsIF9yZXBsYWNlV2l0aEluc3RhbmNlOiBib29sZWFuID0gdHJ1ZSk6IE5vZGVSZXNvdXJjZSB7XHJcbiAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uID0gX25vZGUuc2VyaWFsaXplKCk7XHJcbiAgICAgICAgICAgIGxldCBub2RlUmVzb3VyY2U6IE5vZGVSZXNvdXJjZSA9IG5ldyBOb2RlUmVzb3VyY2UoXCJOb2RlUmVzb3VyY2VcIik7XHJcbiAgICAgICAgICAgIG5vZGVSZXNvdXJjZS5kZXNlcmlhbGl6ZShzZXJpYWxpemF0aW9uKTtcclxuICAgICAgICAgICAgUmVzb3VyY2VNYW5hZ2VyLnJlZ2lzdGVyKG5vZGVSZXNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoX3JlcGxhY2VXaXRoSW5zdGFuY2UgJiYgX25vZGUuZ2V0UGFyZW50KCkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbnN0YW5jZTogTm9kZVJlc291cmNlSW5zdGFuY2UgPSBuZXcgTm9kZVJlc291cmNlSW5zdGFuY2Uobm9kZVJlc291cmNlKTtcclxuICAgICAgICAgICAgICAgIF9ub2RlLmdldFBhcmVudCgpLnJlcGxhY2VDaGlsZChfbm9kZSwgaW5zdGFuY2UpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbm9kZVJlc291cmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2VyaWFsaXplIGFsbCByZXNvdXJjZXNcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uT2ZSZXNvdXJjZXMge1xyXG4gICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbk9mUmVzb3VyY2VzID0ge307XHJcbiAgICAgICAgICAgIGZvciAobGV0IGlkUmVzb3VyY2UgaW4gUmVzb3VyY2VNYW5hZ2VyLnJlc291cmNlcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlc291cmNlOiBTZXJpYWxpemFibGVSZXNvdXJjZSA9IFJlc291cmNlTWFuYWdlci5yZXNvdXJjZXNbaWRSZXNvdXJjZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoaWRSZXNvdXJjZSAhPSByZXNvdXJjZS5pZFJlc291cmNlKVxyXG4gICAgICAgICAgICAgICAgICAgIERlYnVnLmVycm9yKFwiUmVzb3VyY2UtaWQgbWlzbWF0Y2hcIiwgcmVzb3VyY2UpO1xyXG4gICAgICAgICAgICAgICAgc2VyaWFsaXphdGlvbltpZFJlc291cmNlXSA9IFNlcmlhbGl6ZXIuc2VyaWFsaXplKHJlc291cmNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZSByZXNvdXJjZXMgZnJvbSBhIHNlcmlhbGl6YXRpb24sIGRlbGV0aW5nIGFsbCByZXNvdXJjZXMgcHJldmlvdXNseSByZWdpc3RlcmVkXHJcbiAgICAgICAgICogQHBhcmFtIF9zZXJpYWxpemF0aW9uIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb25PZlJlc291cmNlcyk6IFJlc291cmNlcyB7XHJcbiAgICAgICAgICAgIFJlc291cmNlTWFuYWdlci5zZXJpYWxpemF0aW9uID0gX3NlcmlhbGl6YXRpb247XHJcbiAgICAgICAgICAgIFJlc291cmNlTWFuYWdlci5yZXNvdXJjZXMgPSB7fTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaWRSZXNvdXJjZSBpbiBfc2VyaWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSBfc2VyaWFsaXphdGlvbltpZFJlc291cmNlXTtcclxuICAgICAgICAgICAgICAgIGxldCByZXNvdXJjZTogU2VyaWFsaXphYmxlUmVzb3VyY2UgPSBSZXNvdXJjZU1hbmFnZXIuZGVzZXJpYWxpemVSZXNvdXJjZShzZXJpYWxpemF0aW9uKTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZSlcclxuICAgICAgICAgICAgICAgICAgICBSZXNvdXJjZU1hbmFnZXIucmVzb3VyY2VzW2lkUmVzb3VyY2VdID0gcmVzb3VyY2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFJlc291cmNlTWFuYWdlci5yZXNvdXJjZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBkZXNlcmlhbGl6ZVJlc291cmNlKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlUmVzb3VyY2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gPFNlcmlhbGl6YWJsZVJlc291cmNlPlNlcmlhbGl6ZXIuZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9MaWdodC9MaWdodC50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL0V2ZW50L0V2ZW50LnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vQ29tcG9uZW50L0NvbXBvbmVudExpZ2h0LnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIGV4cG9ydCB0eXBlIE1hcExpZ2h0VHlwZVRvTGlnaHRMaXN0ID0gTWFwPFR5cGVPZkxpZ2h0LCBDb21wb25lbnRMaWdodFtdPjtcclxuICAgIC8qKlxyXG4gICAgICogQ29udHJvbHMgdGhlIHJlbmRlcmluZyBvZiBhIGJyYW5jaCBvZiBhIHNjZW5ldHJlZSwgdXNpbmcgdGhlIGdpdmVuIFtbQ29tcG9uZW50Q2FtZXJhXV0sXHJcbiAgICAgKiBhbmQgdGhlIHByb3BhZ2F0aW9uIG9mIHRoZSByZW5kZXJlZCBpbWFnZSBmcm9tIHRoZSBvZmZzY3JlZW4gcmVuZGVyYnVmZmVyIHRvIHRoZSB0YXJnZXQgY2FudmFzXHJcbiAgICAgKiB0aHJvdWdoIGEgc2VyaWVzIG9mIFtbRnJhbWluZ11dIG9iamVjdHMuIFRoZSBzdGFnZXMgaW52b2x2ZWQgYXJlIGluIG9yZGVyIG9mIHJlbmRlcmluZ1xyXG4gICAgICogW1tSZW5kZXJNYW5hZ2VyXV0udmlld3BvcnQgLT4gW1tWaWV3cG9ydF1dLnNvdXJjZSAtPiBbW1ZpZXdwb3J0XV0uZGVzdGluYXRpb24gLT4gRE9NLUNhbnZhcyAtPiBDbGllbnQoQ1NTKVxyXG4gICAgICogQGF1dGhvcnMgSmFzY2hhIEthcmFnw7ZsLCBIRlUsIDIwMTkgfCBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgVmlld3BvcnQgZXh0ZW5kcyBFdmVudFRhcmdldMaSIHtcclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBmb2N1czogVmlld3BvcnQ7XHJcblxyXG4gICAgICAgIHB1YmxpYyBuYW1lOiBzdHJpbmcgPSBcIlZpZXdwb3J0XCI7IC8vIFRoZSBuYW1lIHRvIGNhbGwgdGhpcyB2aWV3cG9ydCBieS5cclxuICAgICAgICBwdWJsaWMgY2FtZXJhOiBDb21wb25lbnRDYW1lcmEgPSBudWxsOyAvLyBUaGUgY2FtZXJhIHJlcHJlc2VudGluZyB0aGUgdmlldyBwYXJhbWV0ZXJzIHRvIHJlbmRlciB0aGUgYnJhbmNoLlxyXG5cclxuICAgICAgICBwdWJsaWMgcmVjdFNvdXJjZTogUmVjdGFuZ2xlO1xyXG4gICAgICAgIHB1YmxpYyByZWN0RGVzdGluYXRpb246IFJlY3RhbmdsZTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogdmVyaWZ5IGlmIGNsaWVudCB0byBjYW52YXMgc2hvdWxkIGJlIGluIFZpZXdwb3J0IG9yIHNvbWV3aGVyZSBlbHNlIChXaW5kb3csIENvbnRhaW5lcj8pXHJcbiAgICAgICAgLy8gTXVsdGlwbGUgdmlld3BvcnRzIHVzaW5nIHRoZSBzYW1lIGNhbnZhcyBzaG91bGRuJ3QgZGlmZmVyIGhlcmUuLi5cclxuICAgICAgICAvLyBkaWZmZXJlbnQgZnJhbWluZyBtZXRob2RzIGNhbiBiZSB1c2VkLCB0aGlzIGlzIHRoZSBkZWZhdWx0XHJcbiAgICAgICAgcHVibGljIGZyYW1lQ2xpZW50VG9DYW52YXM6IEZyYW1pbmdTY2FsZWQgPSBuZXcgRnJhbWluZ1NjYWxlZCgpO1xyXG4gICAgICAgIHB1YmxpYyBmcmFtZUNhbnZhc1RvRGVzdGluYXRpb246IEZyYW1pbmdDb21wbGV4ID0gbmV3IEZyYW1pbmdDb21wbGV4KCk7XHJcbiAgICAgICAgcHVibGljIGZyYW1lRGVzdGluYXRpb25Ub1NvdXJjZTogRnJhbWluZ1NjYWxlZCA9IG5ldyBGcmFtaW5nU2NhbGVkKCk7XHJcbiAgICAgICAgcHVibGljIGZyYW1lU291cmNlVG9SZW5kZXI6IEZyYW1pbmdTY2FsZWQgPSBuZXcgRnJhbWluZ1NjYWxlZCgpO1xyXG5cclxuICAgICAgICBwdWJsaWMgYWRqdXN0aW5nRnJhbWVzOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBwdWJsaWMgYWRqdXN0aW5nQ2FtZXJhOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgcHVibGljIGxpZ2h0czogTWFwTGlnaHRUeXBlVG9MaWdodExpc3QgPSBudWxsO1xyXG5cclxuICAgICAgICBwcml2YXRlIGJyYW5jaDogTm9kZSA9IG51bGw7IC8vIFRoZSBmaXJzdCBub2RlIGluIHRoZSB0cmVlKGJyYW5jaCkgdGhhdCB3aWxsIGJlIHJlbmRlcmVkLlxyXG4gICAgICAgIHByaXZhdGUgY3JjMjogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgcGlja0J1ZmZlcnM6IFBpY2tCdWZmZXJbXSA9IFtdO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb25uZWN0cyB0aGUgdmlld3BvcnQgdG8gdGhlIGdpdmVuIGNhbnZhcyB0byByZW5kZXIgdGhlIGdpdmVuIGJyYW5jaCB0byB1c2luZyB0aGUgZ2l2ZW4gY2FtZXJhLWNvbXBvbmVudCwgYW5kIG5hbWVzIHRoZSB2aWV3cG9ydCBhcyBnaXZlbi5cclxuICAgICAgICAgKiBAcGFyYW0gX25hbWUgXHJcbiAgICAgICAgICogQHBhcmFtIF9icmFuY2ggXHJcbiAgICAgICAgICogQHBhcmFtIF9jYW1lcmEgXHJcbiAgICAgICAgICogQHBhcmFtIF9jYW52YXMgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGluaXRpYWxpemUoX25hbWU6IHN0cmluZywgX2JyYW5jaDogTm9kZSwgX2NhbWVyYTogQ29tcG9uZW50Q2FtZXJhLCBfY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcclxuICAgICAgICAgICAgdGhpcy5jYW1lcmEgPSBfY2FtZXJhO1xyXG4gICAgICAgICAgICB0aGlzLmNhbnZhcyA9IF9jYW52YXM7XHJcbiAgICAgICAgICAgIHRoaXMuY3JjMiA9IF9jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5yZWN0U291cmNlID0gUmVuZGVyTWFuYWdlci5nZXRDYW52YXNSZWN0KCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVjdERlc3RpbmF0aW9uID0gdGhpcy5nZXRDbGllbnRSZWN0YW5nbGUoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0QnJhbmNoKF9icmFuY2gpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXRyaWV2ZSB0aGUgMkQtY29udGV4dCBhdHRhY2hlZCB0byB0aGUgZGVzdGluYXRpb24gY2FudmFzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldENvbnRleHQoKTogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JjMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmUgdGhlIHNpemUgb2YgdGhlIGRlc3RpbmF0aW9uIGNhbnZhcyBhcyBhIHJlY3RhbmdsZSwgeCBhbmQgeSBhcmUgYWx3YXlzIDAgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldENhbnZhc1JlY3RhbmdsZSgpOiBSZWN0YW5nbGUge1xyXG4gICAgICAgICAgICByZXR1cm4gUmVjdGFuZ2xlLkdFVCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmUgdGhlIGNsaWVudCByZWN0YW5nbGUgdGhlIGNhbnZhcyBpcyBkaXNwbGF5ZWQgYW5kIGZpdCBpbiwgeCBhbmQgeSBhcmUgYWx3YXlzIDAgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldENsaWVudFJlY3RhbmdsZSgpOiBSZWN0YW5nbGUge1xyXG4gICAgICAgICAgICByZXR1cm4gUmVjdGFuZ2xlLkdFVCgwLCAwLCB0aGlzLmNhbnZhcy5jbGllbnRXaWR0aCwgdGhpcy5jYW52YXMuY2xpZW50SGVpZ2h0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCB0aGUgYnJhbmNoIHRvIGJlIGRyYXduIGluIHRoZSB2aWV3cG9ydC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0QnJhbmNoKF9icmFuY2g6IE5vZGUpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnJhbmNoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJyYW5jaC5yZW1vdmVFdmVudExpc3RlbmVyKEVWRU5ULkNPTVBPTkVOVF9BREQsIHRoaXMuaG5kQ29tcG9uZW50RXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5icmFuY2gucmVtb3ZlRXZlbnRMaXN0ZW5lcihFVkVOVC5DT01QT05FTlRfUkVNT1ZFLCB0aGlzLmhuZENvbXBvbmVudEV2ZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJyYW5jaCA9IF9icmFuY2g7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdExpZ2h0cygpO1xyXG4gICAgICAgICAgICB0aGlzLmJyYW5jaC5hZGRFdmVudExpc3RlbmVyKEVWRU5ULkNPTVBPTkVOVF9BREQsIHRoaXMuaG5kQ29tcG9uZW50RXZlbnQpO1xyXG4gICAgICAgICAgICB0aGlzLmJyYW5jaC5hZGRFdmVudExpc3RlbmVyKEVWRU5ULkNPTVBPTkVOVF9SRU1PVkUsIHRoaXMuaG5kQ29tcG9uZW50RXZlbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBMb2dzIHRoaXMgdmlld3BvcnRzIHNjZW5lZ3JhcGggdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNob3dTY2VuZUdyYXBoKCk6IHZvaWQge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBtb3ZlIHRvIGRlYnVnLWNsYXNzXHJcbiAgICAgICAgICAgIGxldCBvdXRwdXQ6IHN0cmluZyA9IFwiU2NlbmVHcmFwaCBmb3IgdGhpcyB2aWV3cG9ydDpcIjtcclxuICAgICAgICAgICAgb3V0cHV0ICs9IFwiXFxuIFxcblwiO1xyXG4gICAgICAgICAgICBvdXRwdXQgKz0gdGhpcy5icmFuY2gubmFtZTtcclxuICAgICAgICAgICAgRGVidWcubG9nKG91dHB1dCArIFwiICAgPT4gUk9PVE5PREVcIiArIHRoaXMuY3JlYXRlU2NlbmVHcmFwaCh0aGlzLmJyYW5jaCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gI3JlZ2lvbiBEcmF3aW5nXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRHJhdyB0aGlzIHZpZXdwb3J0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGRyYXcoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIFJlbmRlck1hbmFnZXIucmVzZXRGcmFtZUJ1ZmZlcigpO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY2FtZXJhLmlzQWN0aXZlKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hZGp1c3RpbmdGcmFtZXMpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkanVzdEZyYW1lcygpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hZGp1c3RpbmdDYW1lcmEpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkanVzdENhbWVyYSgpO1xyXG5cclxuICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5jbGVhcih0aGlzLmNhbWVyYS5iYWNrZ3JvdW5kQ29sb3IpO1xyXG4gICAgICAgICAgICBpZiAoUmVuZGVyTWFuYWdlci5hZGRCcmFuY2godGhpcy5icmFuY2gpKVxyXG4gICAgICAgICAgICAgICAgLy8gYnJhbmNoIGhhcyBub3QgeWV0IGJlZW4gcHJvY2Vzc2VkIGZ1bGx5IGJ5IHJlbmRlcm1hbmFnZXIgLT4gdXBkYXRlIGFsbCByZWdpc3RlcmVkIG5vZGVzXHJcbiAgICAgICAgICAgICAgICBSZW5kZXJNYW5hZ2VyLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICBSZW5kZXJNYW5hZ2VyLnNldExpZ2h0cyh0aGlzLmxpZ2h0cyk7XHJcbiAgICAgICAgICAgIFJlbmRlck1hbmFnZXIuZHJhd0JyYW5jaCh0aGlzLmJyYW5jaCwgdGhpcy5jYW1lcmEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jcmMyLmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmNyYzIuZHJhd0ltYWdlKFxyXG4gICAgICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5nZXRDYW52YXMoKSxcclxuICAgICAgICAgICAgICAgIHRoaXMucmVjdFNvdXJjZS54LCB0aGlzLnJlY3RTb3VyY2UueSwgdGhpcy5yZWN0U291cmNlLndpZHRoLCB0aGlzLnJlY3RTb3VyY2UuaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWN0RGVzdGluYXRpb24ueCwgdGhpcy5yZWN0RGVzdGluYXRpb24ueSwgdGhpcy5yZWN0RGVzdGluYXRpb24ud2lkdGgsIHRoaXMucmVjdERlc3RpbmF0aW9uLmhlaWdodFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgKiBEcmF3IHRoaXMgdmlld3BvcnQgZm9yIFJheUNhc3RcclxuICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBjcmVhdGVQaWNrQnVmZmVycygpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYWRqdXN0aW5nRnJhbWVzKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGp1c3RGcmFtZXMoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYWRqdXN0aW5nQ2FtZXJhKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGp1c3RDYW1lcmEoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChSZW5kZXJNYW5hZ2VyLmFkZEJyYW5jaCh0aGlzLmJyYW5jaCkpXHJcbiAgICAgICAgICAgICAgICAvLyBicmFuY2ggaGFzIG5vdCB5ZXQgYmVlbiBwcm9jZXNzZWQgZnVsbHkgYnkgcmVuZGVybWFuYWdlciAtPiB1cGRhdGUgYWxsIHJlZ2lzdGVyZWQgbm9kZXNcclxuICAgICAgICAgICAgICAgIFJlbmRlck1hbmFnZXIudXBkYXRlKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnBpY2tCdWZmZXJzID0gUmVuZGVyTWFuYWdlci5kcmF3QnJhbmNoRm9yUmF5Q2FzdCh0aGlzLmJyYW5jaCwgdGhpcy5jYW1lcmEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jcmMyLmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmNyYzIuZHJhd0ltYWdlKFxyXG4gICAgICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5nZXRDYW52YXMoKSxcclxuICAgICAgICAgICAgICAgIHRoaXMucmVjdFNvdXJjZS54LCB0aGlzLnJlY3RTb3VyY2UueSwgdGhpcy5yZWN0U291cmNlLndpZHRoLCB0aGlzLnJlY3RTb3VyY2UuaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWN0RGVzdGluYXRpb24ueCwgdGhpcy5yZWN0RGVzdGluYXRpb24ueSwgdGhpcy5yZWN0RGVzdGluYXRpb24ud2lkdGgsIHRoaXMucmVjdERlc3RpbmF0aW9uLmhlaWdodFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBwaWNrTm9kZUF0KF9wb3M6IFZlY3RvcjIpOiBSYXlIaXRbXSB7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuY3JlYXRlUGlja0J1ZmZlcnMoKTtcclxuICAgICAgICAgICAgbGV0IGhpdHM6IFJheUhpdFtdID0gUmVuZGVyTWFuYWdlci5waWNrTm9kZUF0KF9wb3MsIHRoaXMucGlja0J1ZmZlcnMsIHRoaXMucmVjdFNvdXJjZSk7XHJcbiAgICAgICAgICAgIGhpdHMuc29ydCgoYTogUmF5SGl0LCBiOiBSYXlIaXQpID0+IChiLnpCdWZmZXIgPiAwKSA/IChhLnpCdWZmZXIgPiAwKSA/IGEuekJ1ZmZlciAtIGIuekJ1ZmZlciA6IDEgOiAtMSk7XHJcbiAgICAgICAgICAgIHJldHVybiBoaXRzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWRqdXN0IGFsbCBmcmFtZXMgaW52b2x2ZWQgaW4gdGhlIHJlbmRlcmluZyBwcm9jZXNzIGZyb20gdGhlIGRpc3BsYXkgYXJlYSBpbiB0aGUgY2xpZW50IHVwIHRvIHRoZSByZW5kZXJlciBjYW52YXNcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgYWRqdXN0RnJhbWVzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICAvLyBnZXQgdGhlIHJlY3RhbmdsZSBvZiB0aGUgY2FudmFzIGFyZWEgYXMgZGlzcGxheWVkIChjb25zaWRlciBjc3MpXHJcbiAgICAgICAgICAgIGxldCByZWN0Q2xpZW50OiBSZWN0YW5nbGUgPSB0aGlzLmdldENsaWVudFJlY3RhbmdsZSgpO1xyXG4gICAgICAgICAgICAvLyBhZGp1c3QgdGhlIGNhbnZhcyBzaXplIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gZnJhbWluZyBhcHBsaWVkIHRvIGNsaWVudFxyXG4gICAgICAgICAgICBsZXQgcmVjdENhbnZhczogUmVjdGFuZ2xlID0gdGhpcy5mcmFtZUNsaWVudFRvQ2FudmFzLmdldFJlY3QocmVjdENsaWVudCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gcmVjdENhbnZhcy53aWR0aDtcclxuICAgICAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gcmVjdENhbnZhcy5oZWlnaHQ7XHJcbiAgICAgICAgICAgIC8vIGFkanVzdCB0aGUgZGVzdGluYXRpb24gYXJlYSBvbiB0aGUgdGFyZ2V0LWNhbnZhcyB0byByZW5kZXIgdG8gYnkgYXBwbHlpbmcgdGhlIGZyYW1pbmcgdG8gY2FudmFzXHJcbiAgICAgICAgICAgIHRoaXMucmVjdERlc3RpbmF0aW9uID0gdGhpcy5mcmFtZUNhbnZhc1RvRGVzdGluYXRpb24uZ2V0UmVjdChyZWN0Q2FudmFzKTtcclxuICAgICAgICAgICAgLy8gYWRqdXN0IHRoZSBhcmVhIG9uIHRoZSBzb3VyY2UtY2FudmFzIHRvIHJlbmRlciBmcm9tIGJ5IGFwcGx5aW5nIHRoZSBmcmFtaW5nIHRvIGRlc3RpbmF0aW9uIGFyZWFcclxuICAgICAgICAgICAgdGhpcy5yZWN0U291cmNlID0gdGhpcy5mcmFtZURlc3RpbmF0aW9uVG9Tb3VyY2UuZ2V0UmVjdCh0aGlzLnJlY3REZXN0aW5hdGlvbik7XHJcbiAgICAgICAgICAgIC8vIGhhdmluZyBhbiBvZmZzZXQgc291cmNlIGRvZXMgbWFrZSBzZW5zZSBvbmx5IHdoZW4gbXVsdGlwbGUgdmlld3BvcnRzIGRpc3BsYXkgcGFydHMgb2YgdGhlIHNhbWUgcmVuZGVyaW5nLiBGb3Igbm93OiBzaGlmdCBpdCB0byAwLDBcclxuICAgICAgICAgICAgdGhpcy5yZWN0U291cmNlLnggPSB0aGlzLnJlY3RTb3VyY2UueSA9IDA7XHJcbiAgICAgICAgICAgIC8vIHN0aWxsLCBhIHBhcnRpYWwgaW1hZ2Ugb2YgdGhlIHJlbmRlcmluZyBtYXkgYmUgcmV0cmlldmVkIGJ5IG1vdmluZyBhbmQgcmVzaXppbmcgdGhlIHJlbmRlciB2aWV3cG9ydFxyXG4gICAgICAgICAgICBsZXQgcmVjdFJlbmRlcjogUmVjdGFuZ2xlID0gdGhpcy5mcmFtZVNvdXJjZVRvUmVuZGVyLmdldFJlY3QodGhpcy5yZWN0U291cmNlKTtcclxuICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5zZXRWaWV3cG9ydFJlY3RhbmdsZShyZWN0UmVuZGVyKTtcclxuICAgICAgICAgICAgLy8gbm8gbW9yZSB0cmFuc2Zvcm1hdGlvbiBhZnRlciB0aGlzIGZvciBub3csIG9mZnNjcmVlbiBjYW52YXMgYW5kIHJlbmRlci12aWV3cG9ydCBoYXZlIHRoZSBzYW1lIHNpemVcclxuICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5zZXRDYW52YXNTaXplKHJlY3RSZW5kZXIud2lkdGgsIHJlY3RSZW5kZXIuaGVpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWRqdXN0IHRoZSBjYW1lcmEgcGFyYW1ldGVycyB0byBmaXQgdGhlIHJlbmRlcmluZyBpbnRvIHRoZSByZW5kZXIgdmllcG9ydFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBhZGp1c3RDYW1lcmEoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCByZWN0OiBSZWN0YW5nbGUgPSBSZW5kZXJNYW5hZ2VyLmdldFZpZXdwb3J0UmVjdGFuZ2xlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2FtZXJhLnByb2plY3RDZW50cmFsKHJlY3Qud2lkdGggLyByZWN0LmhlaWdodCwgdGhpcy5jYW1lcmEuZ2V0RmllbGRPZlZpZXcoKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vICNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIFBvaW50c1xyXG4gICAgICAgIHB1YmxpYyBwb2ludENsaWVudFRvU291cmNlKF9jbGllbnQ6IFZlY3RvcjIpOiBWZWN0b3IyIHtcclxuICAgICAgICAgICAgbGV0IHJlc3VsdDogVmVjdG9yMjtcclxuICAgICAgICAgICAgbGV0IHJlY3Q6IFJlY3RhbmdsZTtcclxuICAgICAgICAgICAgcmVjdCA9IHRoaXMuZ2V0Q2xpZW50UmVjdGFuZ2xlKCk7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuZnJhbWVDbGllbnRUb0NhbnZhcy5nZXRQb2ludChfY2xpZW50LCByZWN0KTtcclxuICAgICAgICAgICAgcmVjdCA9IHRoaXMuZ2V0Q2FudmFzUmVjdGFuZ2xlKCk7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuZnJhbWVDYW52YXNUb0Rlc3RpbmF0aW9uLmdldFBvaW50KHJlc3VsdCwgcmVjdCk7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuZnJhbWVEZXN0aW5hdGlvblRvU291cmNlLmdldFBvaW50KHJlc3VsdCwgdGhpcy5yZWN0U291cmNlKTtcclxuICAgICAgICAgICAgLy9UT0RPOiB3aGVuIFNvdXJjZSwgUmVuZGVyIGFuZCBSZW5kZXJWaWV3cG9ydCBkZXZpYXRlLCBjb250aW51ZSB0cmFuc2Zvcm1hdGlvbiBcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBwb2ludFNvdXJjZVRvUmVuZGVyKF9zb3VyY2U6IFZlY3RvcjIpOiBWZWN0b3IyIHtcclxuICAgICAgICAgICAgbGV0IHByb2plY3Rpb25SZWN0YW5nbGU6IFJlY3RhbmdsZSA9IHRoaXMuY2FtZXJhLmdldFByb2plY3Rpb25SZWN0YW5nbGUoKTtcclxuICAgICAgICAgICAgbGV0IHBvaW50OiBWZWN0b3IyID0gdGhpcy5mcmFtZVNvdXJjZVRvUmVuZGVyLmdldFBvaW50KF9zb3VyY2UsIHByb2plY3Rpb25SZWN0YW5nbGUpO1xyXG4gICAgICAgICAgICByZXR1cm4gcG9pbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgcG9pbnRDbGllbnRUb1JlbmRlcihfY2xpZW50OiBWZWN0b3IyKTogVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGxldCBwb2ludDogVmVjdG9yMiA9IHRoaXMucG9pbnRDbGllbnRUb1NvdXJjZShfY2xpZW50KTtcclxuICAgICAgICAgICAgcG9pbnQgPSB0aGlzLnBvaW50U291cmNlVG9SZW5kZXIocG9pbnQpO1xyXG4gICAgICAgICAgICAvL1RPRE86IHdoZW4gUmVuZGVyIGFuZCBSZW5kZXJWaWV3cG9ydCBkZXZpYXRlLCBjb250aW51ZSB0cmFuc2Zvcm1hdGlvbiBcclxuICAgICAgICAgICAgcmV0dXJuIHBvaW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vICNyZWdpb24gRXZlbnRzIChwYXNzaW5nIGZyb20gY2FudmFzIHRvIHZpZXdwb3J0IGFuZCBmcm9tIHRoZXJlIGludG8gYnJhbmNoKVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGlzIHZpZXdwb3J0IGN1cnJlbnRseSBoYXMgZm9jdXMgYW5kIHRodXMgcmVjZWl2ZXMga2V5Ym9hcmQgZXZlbnRzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldCBoYXNGb2N1cygpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIChWaWV3cG9ydC5mb2N1cyA9PSB0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU3dpdGNoIHRoZSB2aWV3cG9ydHMgZm9jdXMgb24gb3Igb2ZmLiBPbmx5IG9uZSB2aWV3cG9ydCBpbiBvbmUgRlVER0UgaW5zdGFuY2UgY2FuIGhhdmUgdGhlIGZvY3VzLCB0aHVzIHJlY2VpdmluZyBrZXlib2FyZCBldmVudHMuIFxyXG4gICAgICAgICAqIFNvIGEgdmlld3BvcnQgY3VycmVudGx5IGhhdmluZyB0aGUgZm9jdXMgd2lsbCBsb3NlIGl0LCB3aGVuIGFub3RoZXIgb25lIHJlY2VpdmVzIGl0LiBUaGUgdmlld3BvcnRzIGZpcmUgW1tFdmVudF1dcyBhY2NvcmRpbmdseS5cclxuICAgICAgICAgKiAgXHJcbiAgICAgICAgICogQHBhcmFtIF9vbiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0Rm9jdXMoX29uOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmIChfb24pIHtcclxuICAgICAgICAgICAgICAgIGlmIChWaWV3cG9ydC5mb2N1cyA9PSB0aGlzKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGlmIChWaWV3cG9ydC5mb2N1cylcclxuICAgICAgICAgICAgICAgICAgICBWaWV3cG9ydC5mb2N1cy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChFVkVOVC5GT0NVU19PVVQpKTtcclxuICAgICAgICAgICAgICAgIFZpZXdwb3J0LmZvY3VzID0gdGhpcztcclxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoRVZFTlQuRk9DVVNfSU4pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChWaWV3cG9ydC5mb2N1cyAhPSB0aGlzKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KEVWRU5ULkZPQ1VTX09VVCkpO1xyXG4gICAgICAgICAgICAgICAgVmlld3BvcnQuZm9jdXMgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERlLSAvIEFjdGl2YXRlcyB0aGUgZ2l2ZW4gcG9pbnRlciBldmVudCB0byBiZSBwcm9wYWdhdGVkIGludG8gdGhlIHZpZXdwb3J0IGFzIEZVREdFLUV2ZW50IFxyXG4gICAgICAgICAqIEBwYXJhbSBfdHlwZSBcclxuICAgICAgICAgKiBAcGFyYW0gX29uIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBhY3RpdmF0ZVBvaW50ZXJFdmVudChfdHlwZTogRVZFTlRfUE9JTlRFUiwgX29uOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVFdmVudCh0aGlzLmNhbnZhcywgX3R5cGUsIHRoaXMuaG5kUG9pbnRlckV2ZW50LCBfb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBEZS0gLyBBY3RpdmF0ZXMgdGhlIGdpdmVuIGtleWJvYXJkIGV2ZW50IHRvIGJlIHByb3BhZ2F0ZWQgaW50byB0aGUgdmlld3BvcnQgYXMgRlVER0UtRXZlbnRcclxuICAgICAgICAgKiBAcGFyYW0gX3R5cGUgXHJcbiAgICAgICAgICogQHBhcmFtIF9vbiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgYWN0aXZhdGVLZXlib2FyZEV2ZW50KF90eXBlOiBFVkVOVF9LRVlCT0FSRCwgX29uOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVFdmVudCh0aGlzLmNhbnZhcy5vd25lckRvY3VtZW50LCBfdHlwZSwgdGhpcy5obmRLZXlib2FyZEV2ZW50LCBfb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBEZS0gLyBBY3RpdmF0ZXMgdGhlIGdpdmVuIGRyYWctZHJvcCBldmVudCB0byBiZSBwcm9wYWdhdGVkIGludG8gdGhlIHZpZXdwb3J0IGFzIEZVREdFLUV2ZW50XHJcbiAgICAgICAgICogQHBhcmFtIF90eXBlIFxyXG4gICAgICAgICAqIEBwYXJhbSBfb24gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGFjdGl2YXRlRHJhZ0Ryb3BFdmVudChfdHlwZTogRVZFTlRfRFJBR0RST1AsIF9vbjogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAoX3R5cGUgPT0gRVZFTlRfRFJBR0RST1AuU1RBUlQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy5kcmFnZ2FibGUgPSBfb247XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVFdmVudCh0aGlzLmNhbnZhcywgX3R5cGUsIHRoaXMuaG5kRHJhZ0Ryb3BFdmVudCwgX29uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRGUtIC8gQWN0aXZhdGVzIHRoZSB3aGVlbCBldmVudCB0byBiZSBwcm9wYWdhdGVkIGludG8gdGhlIHZpZXdwb3J0IGFzIEZVREdFLUV2ZW50XHJcbiAgICAgICAgICogQHBhcmFtIF90eXBlIFxyXG4gICAgICAgICAqIEBwYXJhbSBfb24gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGFjdGl2YXRlV2hlZWxFdmVudChfdHlwZTogRVZFTlRfV0hFRUwsIF9vbjogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlRXZlbnQodGhpcy5jYW52YXMsIF90eXBlLCB0aGlzLmhuZFdoZWVsRXZlbnQsIF9vbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEhhbmRsZSBkcmFnLWRyb3AgZXZlbnRzIGFuZCBkaXNwYXRjaCB0byB2aWV3cG9ydCBhcyBGVURHRS1FdmVudFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgaG5kRHJhZ0Ryb3BFdmVudDogRXZlbnRMaXN0ZW5lciA9IChfZXZlbnQ6IEV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBfZHJhZ2V2ZW50OiBEcmFnRHJvcEV2ZW50xpIgPSA8RHJhZ0Ryb3BFdmVudMaSPl9ldmVudDtcclxuICAgICAgICAgICAgc3dpdGNoIChfZHJhZ2V2ZW50LnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkcmFnb3ZlclwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRyb3BcIjpcclxuICAgICAgICAgICAgICAgICAgICBfZHJhZ2V2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RyYWdldmVudC5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9IFwibm9uZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImRyYWdzdGFydFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGp1c3QgZHVtbXkgZGF0YSwgIHZhbGlkIGRhdGEgc2hvdWxkIGJlIHNldCBpbiBoYW5kbGVyIHJlZ2lzdGVyZWQgYnkgdGhlIHVzZXJcclxuICAgICAgICAgICAgICAgICAgICBfZHJhZ2V2ZW50LmRhdGFUcmFuc2Zlci5zZXREYXRhKFwidGV4dFwiLCBcIkhhbGxvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIGlmIHRoZXJlIGlzIGEgYmV0dGVyIHNvbHV0aW9uIHRvIGhpZGUgdGhlIGdob3N0IGltYWdlIG9mIHRoZSBkcmFnZ2FibGUgb2JqZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgX2RyYWdldmVudC5kYXRhVHJhbnNmZXIuc2V0RHJhZ0ltYWdlKG5ldyBJbWFnZSgpLCAwLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgZXZlbnQ6IERyYWdEcm9wRXZlbnTGkiA9IG5ldyBEcmFnRHJvcEV2ZW50xpIoXCLGklwiICsgX2V2ZW50LnR5cGUsIF9kcmFnZXZlbnQpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENhbnZhc1Bvc2l0aW9uKGV2ZW50KTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWRkIHBvc2l0aW9uIG9mIHRoZSBwb2ludGVyIG1hcHBlZCB0byBjYW52YXMtY29vcmRpbmF0ZXMgYXMgY2FudmFzWCwgY2FudmFzWSB0byB0aGUgZXZlbnRcclxuICAgICAgICAgKiBAcGFyYW0gZXZlbnRcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGFkZENhbnZhc1Bvc2l0aW9uKGV2ZW50OiBQb2ludGVyRXZlbnTGkiB8IERyYWdEcm9wRXZlbnTGkik6IHZvaWQge1xyXG4gICAgICAgICAgICBldmVudC5jYW52YXNYID0gdGhpcy5jYW52YXMud2lkdGggKiBldmVudC5wb2ludGVyWCAvIGV2ZW50LmNsaWVudFJlY3Qud2lkdGg7XHJcbiAgICAgICAgICAgIGV2ZW50LmNhbnZhc1kgPSB0aGlzLmNhbnZhcy5oZWlnaHQgKiBldmVudC5wb2ludGVyWSAvIGV2ZW50LmNsaWVudFJlY3QuaGVpZ2h0O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBIYW5kbGUgcG9pbnRlciBldmVudHMgYW5kIGRpc3BhdGNoIHRvIHZpZXdwb3J0IGFzIEZVREdFLUV2ZW50XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBobmRQb2ludGVyRXZlbnQ6IEV2ZW50TGlzdGVuZXIgPSAoX2V2ZW50OiBFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZXZlbnQ6IFBvaW50ZXJFdmVudMaSID0gbmV3IFBvaW50ZXJFdmVudMaSKFwixpJcIiArIF9ldmVudC50eXBlLCA8UG9pbnRlckV2ZW50xpI+X2V2ZW50KTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDYW52YXNQb3NpdGlvbihldmVudCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEhhbmRsZSBrZXlib2FyZCBldmVudHMgYW5kIGRpc3BhdGNoIHRvIHZpZXdwb3J0IGFzIEZVREdFLUV2ZW50LCBpZiB0aGUgdmlld3BvcnQgaGFzIHRoZSBmb2N1c1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgaG5kS2V5Ym9hcmRFdmVudDogRXZlbnRMaXN0ZW5lciA9IChfZXZlbnQ6IEV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5oYXNGb2N1cylcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgbGV0IGV2ZW50OiBLZXlib2FyZEV2ZW50xpIgPSBuZXcgS2V5Ym9hcmRFdmVudMaSKFwixpJcIiArIF9ldmVudC50eXBlLCA8S2V5Ym9hcmRFdmVudMaSPl9ldmVudCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEhhbmRsZSB3aGVlbCBldmVudCBhbmQgZGlzcGF0Y2ggdG8gdmlld3BvcnQgYXMgRlVER0UtRXZlbnRcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGhuZFdoZWVsRXZlbnQ6IEV2ZW50TGlzdGVuZXIgPSAoX2V2ZW50OiBFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZXZlbnQ6IFdoZWVsRXZlbnTGkiA9IG5ldyBXaGVlbEV2ZW50xpIoXCLGklwiICsgX2V2ZW50LnR5cGUsIDxXaGVlbEV2ZW50xpI+X2V2ZW50KTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgYWN0aXZhdGVFdmVudChfdGFyZ2V0OiBFdmVudFRhcmdldCwgX3R5cGU6IHN0cmluZywgX2hhbmRsZXI6IEV2ZW50TGlzdGVuZXIsIF9vbjogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICAgICAgICBfdHlwZSA9IF90eXBlLnNsaWNlKDEpOyAvLyBjaGlwIHRoZSDGkmxvcmVudGluXHJcbiAgICAgICAgICAgIGlmIChfb24pXHJcbiAgICAgICAgICAgICAgICBfdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoX3R5cGUsIF9oYW5kbGVyKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgX3RhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKF90eXBlLCBfaGFuZGxlcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhuZENvbXBvbmVudEV2ZW50KF9ldmVudDogRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICAgICAgRGVidWcubG9nKF9ldmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vICNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29sbGVjdCBhbGwgbGlnaHRzIGluIHRoZSBicmFuY2ggdG8gcGFzcyB0byBzaGFkZXJzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBjb2xsZWN0TGlnaHRzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBtYWtlIHByaXZhdGVcclxuICAgICAgICAgICAgdGhpcy5saWdodHMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG5vZGUgb2YgdGhpcy5icmFuY2guYnJhbmNoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY21wTGlnaHRzOiBDb21wb25lbnRMaWdodFtdID0gbm9kZS5nZXRDb21wb25lbnRzKENvbXBvbmVudExpZ2h0KTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGNtcExpZ2h0IG9mIGNtcExpZ2h0cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0eXBlOiBUeXBlT2ZMaWdodCA9IGNtcExpZ2h0LmxpZ2h0LmdldFR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbGlnaHRzT2ZUeXBlOiBDb21wb25lbnRMaWdodFtdID0gdGhpcy5saWdodHMuZ2V0KHR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbGlnaHRzT2ZUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpZ2h0c09mVHlwZSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZ2h0cy5zZXQodHlwZSwgbGlnaHRzT2ZUeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgbGlnaHRzT2ZUeXBlLnB1c2goY21wTGlnaHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZXMgYW4gb3V0cHV0c3RyaW5nIGFzIHZpc3VhbCByZXByZXNlbnRhdGlvbiBvZiB0aGlzIHZpZXdwb3J0cyBzY2VuZWdyYXBoLiBDYWxsZWQgZm9yIHRoZSBwYXNzZWQgbm9kZSBhbmQgcmVjdXJzaXZlIGZvciBhbGwgaXRzIGNoaWxkcmVuLlxyXG4gICAgICAgICAqIEBwYXJhbSBfZnVkZ2VOb2RlIFRoZSBub2RlIHRvIGNyZWF0ZSBhIHNjZW5lZ3JhcGhlbnRyeSBmb3IuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBjcmVhdGVTY2VuZUdyYXBoKF9mdWRnZU5vZGU6IE5vZGUpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBtb3ZlIHRvIGRlYnVnLWNsYXNzXHJcbiAgICAgICAgICAgIGxldCBvdXRwdXQ6IHN0cmluZyA9IFwiXCI7XHJcbiAgICAgICAgICAgIGZvc
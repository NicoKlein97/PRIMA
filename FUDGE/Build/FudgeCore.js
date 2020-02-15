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
    // export interface MutatorForComponent extends Mutator { readonly forUserComponent: null; }
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
         * Collect the attributes of the instance and their values applicable for indiviualization by the component.
         * Basic functionality is identical to [[getMutator]], returned mutator should then be reduced by the subclassed instance
         */
        // public getMutatorForComponent(): MutatorForComponent {
        //     return <MutatorForComponent>this.getMutator();
        // }
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
     * @authors Thomas Dorner, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2020
     */
    class Audio extends AudioBuffer {
        // constructor(_url: string, _options: AudioBufferOptions) {
        //   super(_options);
        //   return await Audio.load(_url);
        // return this;
        static async load(_url) {
            const response = await window.fetch(_url);
            const arrayBuffer = await response.arrayBuffer();
            return (await FudgeCore.AudioManager.default.decodeAudioData(arrayBuffer));
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
            this.setConeInnerAngle(360);
            this.setConeOuterAngle(0);
            this.setConeOuterGain(1);
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
    class AudioManager extends AudioContext {
        constructor(contextOptions) {
            super(contextOptions);
            this.listenTo = (_branch) => {
                if (this.branch)
                    this.branch.broadcastEvent(new Event("childRemoveFromAudioBranch" /* CHILD_REMOVE */));
                if (!_branch)
                    return;
                this.branch = _branch;
                this.branch.broadcastEvent(new Event("childAppendToAudioBranch" /* CHILD_APPEND */));
            };
            this.getBranchListeningTo = () => {
                return this.branch;
            };
            this.update = () => {
                this.branch.broadcastEvent(new Event("updateAudioBranch" /* UPDATE_PANNER */));
            };
            this.gain = this.createGain();
            this.gain.connect(this.destination);
        }
    }
    AudioManager.default = new AudioManager({ latencyHint: "interactive", sampleRate: 44100 });
    FudgeCore.AudioManager = AudioManager;
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
var FudgeCore;
(function (FudgeCore) {
    /**
     * Describes the [[Audio]] class in which all Audio Data is stored.
     * Audio will be given to the [[ComponentAudio]] for further usage.
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioX {
        /**
         * Constructor for the [[Audio]] Class
         * @param _audioContext from [[AudioSettings]]
         * @param _gainValue 0 for muted | 1 for max volume
         */
        constructor(_audioSettings, _url, _gainValue, _loop) {
            this.init(_audioSettings, _url, _gainValue, _loop);
        }
        async init(_audioSettings, _url, _volume, _loop) {
            this.url = _url;
            // Get AudioBuffer
            const promiseBuffer = _audioSettings.getAudioSession().urlToBuffer(_audioSettings.getAudioContext(), _url);
            while (!promiseBuffer) {
                console.log("Waiting for Promise..");
            }
            await promiseBuffer.then(val => {
                this.audioBuffer = val;
            });
            this.localGain = _audioSettings.getAudioContext().createGain();
            this.volume = _volume;
            this.createAudio(_audioSettings, this.audioBuffer);
            this.isLooping = _loop;
        }
        initBufferSource(_audioSettings) {
            this.bufferSource = _audioSettings.getAudioContext().createBufferSource();
            this.bufferSource.buffer = this.audioBuffer;
            this.beginLoop();
            this.bufferSource.connect(this.localGain);
        }
        connect(_audioNode) {
            this.localGain.connect(_audioNode);
        }
        set volume(_volume) {
            this.localGain.gain.value = _volume;
        }
        get volume() {
            return this.localGain.gain.value;
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
    FudgeCore.AudioX = AudioX;
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
                crc3.uniformMatrix3fv(_renderShader.uniforms["u_pivot"], false, this.pivot.get());
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
        static initialize(_antialias = false, _alpha = true) {
            let contextAttributes = { alpha: _alpha, antialias: _antialias, premultipliedAlpha: false };
            let canvas = document.createElement("canvas");
            RenderOperator.crc3 = RenderOperator.assert(canvas.getContext("webgl2", contextAttributes), "WebGL-context couldn't be created");
            // Enable backface- and zBuffer-culling.
            RenderOperator.crc3.enable(WebGL2RenderingContext.CULL_FACE);
            RenderOperator.crc3.enable(WebGL2RenderingContext.DEPTH_TEST);
            RenderOperator.crc3.enable(WebGL2RenderingContext.BLEND);
            RenderOperator.crc3.blendEquation(WebGL2RenderingContext.FUNC_ADD);
            RenderOperator.crc3.blendFunc(WebGL2RenderingContext.DST_ALPHA, WebGL2RenderingContext.ONE_MINUS_DST_ALPHA);
            // RenderOperator.crc3.enable(WebGL2RenderingContext.);
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
var FudgeCore;
(function (FudgeCore) {
    /**
     * A [[Coat]] providing a texture and additional data for texturing
     */
    let CoatTextured = class CoatTextured extends FudgeCore.Coat {
        constructor() {
            super(...arguments);
            this.texture = null;
            this.pivot = FudgeCore.Matrix3x3.IDENTITY;
            // public getMutatorForComponent(): MutatorForComponent {
            //   let mutatorPivot: MutatorForComponent = <MutatorForComponent><unknown>this.pivot.getMutator();
            //   return mutatorPivot;
            // }
            // public mutate(_mutator: MutatorForComponent): void {
            //   this.pivot.mutate(_mutator);
            // }
        }
    };
    CoatTextured = __decorate([
        FudgeCore.RenderInjector.decorateCoat
    ], CoatTextured);
    FudgeCore.CoatTextured = CoatTextured;
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
     * @authors Thomas Dorner, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentAudio extends FudgeCore.Component {
        constructor(_audio = null, _loop = false, _start = false) {
            super();
            this.pivot = FudgeCore.Matrix4x4.IDENTITY;
            this.singleton = false;
            this.playing = false;
            this.connected = false;
            // solely for testing component standalone. Determine at runtime
            // private attached: boolean = false;
            this.listened = false;
            /**
             * Automatically connects/disconnects AudioNodes when adding/removing this component to/from a node.
             * Therefore unused AudioNodes may be garbage collected when an unused component is collected
             */
            this.handleAttach = (_event) => {
                FudgeCore.Debug.log(_event);
                if (_event.type == "componentAdd" /* COMPONENT_ADD */) {
                    this.getContainer().addEventListener("childAppendToAudioBranch" /* CHILD_APPEND */, this.handleBranch, true);
                    this.getContainer().addEventListener("childRemoveFromAudioBranch" /* CHILD_REMOVE */, this.handleBranch, true);
                    this.getContainer().addEventListener("updateAudioBranch" /* UPDATE_PANNER */, this.updatePanner, true);
                    this.listened = this.getContainer().isDescendantOf(FudgeCore.AudioManager.default.getBranchListeningTo());
                }
                else {
                    this.getContainer().removeEventListener("childAppendToAudioBranch" /* CHILD_APPEND */, this.handleBranch, true);
                    this.getContainer().removeEventListener("childRemoveFromAudioBranch" /* CHILD_REMOVE */, this.handleBranch, true);
                    this.getContainer().removeEventListener("updateAudioBranch" /* UPDATE_PANNER */, this.updatePanner, true);
                    this.listened = false;
                }
                this.updateConnection();
            };
            /**
             * Automatically connects/disconnects AudioNodes when appending/removing the branch the component is in.
             */
            this.handleBranch = (_event) => {
                FudgeCore.Debug.log(_event);
                this.listened = (_event.type == "childAppendToAudioBranch" /* CHILD_APPEND */);
                this.updateConnection();
            };
            /**
             * Updates the panner node, its position and direction, using the worldmatrix of the container and the pivot of this component.
             */
            this.updatePanner = (_event) => {
                FudgeCore.Debug.log(_event);
                let local = FudgeCore.Matrix4x4.MULTIPLICATION(this.getContainer().mtxWorld, this.pivot);
                FudgeCore.Debug.log(local.toString());
                this.panner.setPosition(local.translation.x, local.translation.y, local.translation.z);
            };
            this.install();
            this.createSource(_audio, _loop);
            this.addEventListener("componentAdd" /* COMPONENT_ADD */, this.handleAttach);
            this.addEventListener("componentRemove" /* COMPONENT_REMOVE */, this.handleAttach);
            if (_start)
                this.play(_start);
        }
        set audio(_audio) {
            this.source.buffer = _audio;
        }
        get audio() {
            return this.source.buffer;
        }
        play(_on) {
            if (_on) {
                this.createSource(this.audio, this.source.loop);
                this.source.start(0, 0);
            }
            else
                this.source.stop();
            this.playing = _on;
        }
        // public reset(): void {
        //   this.source.re
        // }
        get isPlaying() {
            return this.playing;
        }
        get isConnected() {
            return this.connected;
        }
        get isAttached() {
            return this.getContainer() != null;
        }
        get isListened() {
            return this.listened;
        }
        // public get isConnected(): boolean {
        //   return this.connected;
        // }
        /**
         * Activate override. Connects or disconnects AudioNodes
         */
        activate(_on) {
            super.activate(_on);
            this.updateConnection();
        }
        install(_audioManager = FudgeCore.AudioManager.default) {
            let active = this.isActive;
            this.activate(false);
            this.audioManager = _audioManager;
            this.panner = _audioManager.createPanner();
            this.gain = _audioManager.createGain();
            this.panner.connect(this.gain);
            this.gain.connect(_audioManager.gain);
            this.activate(active);
        }
        createSource(_audio, _loop) {
            this.source = this.audioManager.createBufferSource();
            this.source.connect(this.panner);
            if (_audio)
                this.audio = _audio;
            this.source.loop = _loop;
        }
        connect(_on) {
            if (_on)
                this.gain.connect(this.audioManager.gain);
            else
                this.gain.disconnect(this.audioManager.gain);
        }
        updateConnection() {
            try {
                this.connect(this.isActive && this.isAttached && this.listened);
            }
            catch (_error) {
                // nop
            }
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
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a [[ComponentAudio]] to a [[Node]].
     * Only a single [[Audio]] can be used within a single [[ComponentAudio]]
     * @authors Thomas Dorner, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentAudioX extends FudgeCore.Component {
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
            this.playing = false;
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
            this.audio.bufferSource.start(_audioSettings.getAudioContext().currentTime, _offset, _duration);
            this.playing = true;
        }
        stop() {
            this.audio.bufferSource.stop();
            this.playing = false;
        }
        get isPlaying() {
            return this.playing;
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
            // const bufferSource: AudioBufferSourceNode = this.audio.bufferSource;
            // const gainLocal: GainNode = this.audio.volume;
            let panner;
            let filter;
            let delay;
            const gainMaster = _audioSettings.masterGain;
            console.log("-------------------------------");
            console.log("Connecting Properties for Audio");
            console.log("-------------------------------");
            //  bufferSource.connect(gainLocal);
            if (this.isLocalised && this.localisation != null) {
                console.log("Connect Localisation");
                panner = this.localisation.pannerNode;
                this.audio.connect(panner);
                if (this.isFiltered && this.filter != null) {
                    console.log("Connect Filter");
                    filter = this.filter.audioFilter;
                    panner.connect(filter);
                    if (this.isDelayed && this.delay != null) {
                        console.log("Connect Delay");
                        delay = this.delay.audioDelay;
                        filter.connect(delay);
                        console.log("Connect Master Gain");
                        delay.connect(gainMaster);
                    }
                    else {
                        console.log("Connect Master Gain");
                        filter.connect(gainMaster);
                    }
                }
                else {
                    if (this.isDelayed && this.delay != null) {
                        console.log("Connect Delay");
                        delay = this.delay.audioDelay;
                        panner.connect(delay);
                        console.log("Connect Master Gain");
                        delay.connect(gainMaster);
                    }
                    else {
                        console.log("Connect Master Gain");
                        panner.connect(gainMaster);
                    }
                }
            }
            else if (this.isFiltered && this.filter != null) {
                console.log("Connect Filter");
                filter = this.filter.audioFilter;
                this.audio.connect(filter);
                if (this.isDelayed && this.delay != null) {
                    console.log("Connect Delay");
                    delay = this.delay.audioDelay;
                    filter.connect(delay);
                    console.log("Connect Master Gain");
                    delay.connect(gainMaster);
                }
                else {
                    console.log("Connect Master Gain");
                    filter.connect(gainMaster);
                }
            }
            else if (this.isDelayed && this.delay != null) {
                console.log("Connect Delay");
                delay = this.delay.audioDelay;
                this.audio.connect(delay);
                console.log("Connect Master Gain");
                delay.connect(gainMaster);
            }
            else {
                console.log("Connect Only Master Gain");
                this.audio.connect(gainMaster);
            }
            console.log("-------------------------------");
        }
    }
    FudgeCore.ComponentAudioX = ComponentAudioX;
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
            //TODO: optimize, no need to recalculate if neither mtxWorld nor pivot have changed
            let mtxCamera = this.pivot;
            try {
                mtxCamera = FudgeCore.Matrix4x4.MULTIPLICATION(this.getContainer().mtxWorld, this.pivot);
            }
            catch (_error) {
                // no container node or no world transformation found -> continue with pivot only
            }
            let mtxWorldProjection = FudgeCore.Matrix4x4.INVERSION(mtxCamera);
            mtxWorldProjection = FudgeCore.Matrix4x4.MULTIPLICATION(this.transform, mtxWorldProjection);
            return mtxWorldProjection;
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
         * Return the calculated normed dimension of the projection surface, that is in the hypothetical distance of 1 to the camera
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
        project(_pointInWorldSpace) {
            let result;
            result = FudgeCore.Vector3.TRANSFORMATION(_pointInWorldSpace, this.ViewProjectionMatrix);
            let m = this.ViewProjectionMatrix.get();
            let w = m[3] * _pointInWorldSpace.x + m[7] * _pointInWorldSpace.y + m[11] * _pointInWorldSpace.z + m[15];
            result.scale(1 / w);
            return result;
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
        // public mutatorCoat: MutatorForComponent;
        constructor(_material = null) {
            super();
            this.material = _material;
            // this.mutatorCoat = _material.getCoat().getMutatorForComponent();
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
        DEBUG_FILTER[DEBUG_FILTER["CLEAR"] = 16] = "CLEAR";
        DEBUG_FILTER[DEBUG_FILTER["GROUP"] = 32] = "GROUP";
        DEBUG_FILTER[DEBUG_FILTER["GROUPCOLLAPSED"] = 64] = "GROUPCOLLAPSED";
        DEBUG_FILTER[DEBUG_FILTER["GROUPEND"] = 128] = "GROUPEND";
        DEBUG_FILTER[DEBUG_FILTER["MESSAGES"] = 15] = "MESSAGES";
        DEBUG_FILTER[DEBUG_FILTER["FORMAT"] = 240] = "FORMAT";
        DEBUG_FILTER[DEBUG_FILTER["ALL"] = 255] = "ALL";
    })(DEBUG_FILTER = FudgeCore.DEBUG_FILTER || (FudgeCore.DEBUG_FILTER = {}));
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Base class for the different DebugTargets, mainly for technical purpose of inheritance
     */
    class DebugTarget {
        static mergeArguments(_message, ..._args) {
            let out = _message.toString(); //JSON.stringify(_message);
            for (let arg of _args)
                if (arg instanceof Number)
                    out += ", " + arg.toPrecision(2).toString(); //JSON.stringify(arg, null, 2);
                else
                    out += ", " + arg.toString(); //JSON.stringify(arg, null, 2);
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
                let args = _args.map(_arg => _arg.toString());
                let out = _headline + "\n\n" + FudgeCore.DebugTarget.mergeArguments(_message, args);
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
        [FudgeCore.DEBUG_FILTER.ERROR]: console.error,
        [FudgeCore.DEBUG_FILTER.CLEAR]: console.clear,
        [FudgeCore.DEBUG_FILTER.GROUP]: console.group,
        [FudgeCore.DEBUG_FILTER.GROUPCOLLAPSED]: console.groupCollapsed,
        [FudgeCore.DEBUG_FILTER.GROUPEND]: console.groupEnd
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
     * Override functions in subclasses of [[DebugTarget]] and register them as their delegates
     */
    class Debug {
        /**
         * De- / Activate a filter for the given DebugTarget.
         */
        static setFilter(_target, _filter) {
            for (let filter in Debug.delegates)
                Debug.delegates[filter].delete(_target);
            for (let filter in FudgeCore.DEBUG_FILTER) {
                let parsed = parseInt(filter);
                if (isNaN(parsed))
                    break;
                if ([FudgeCore.DEBUG_FILTER.MESSAGES, FudgeCore.DEBUG_FILTER.FORMAT, FudgeCore.DEBUG_FILTER.ALL].indexOf(parsed) != -1)
                    // dont delegate combos... 
                    continue;
                if (_filter & parsed)
                    Debug.delegates[parsed].set(_target, _target.delegates[parsed]);
            }
        }
        /**
         * Info(...) displays additional information with low priority
         */
        static info(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.INFO, _message, _args);
        }
        /**
         * Displays information with medium priority
         */
        static log(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.LOG, _message, _args);
        }
        /**
         * Displays information about non-conformities in usage, which is emphasized e.g. by color
         */
        static warn(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.WARN, _message, _args);
        }
        /**
         * Displays critical information about failures, which is emphasized e.g. by color
         */
        static error(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.ERROR, _message, _args);
        }
        /**
         * Clears the output and removes previous messages if possible
         */
        static clear() {
            Debug.delegate(FudgeCore.DEBUG_FILTER.CLEAR, null, null);
        }
        /**
         * Opens a new group for messages
         */
        static group(_name) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.GROUP, _name, null);
        }
        /**
         * Opens a new group for messages that is collapsed at first
         */
        static groupCollapsed(_name) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.GROUPCOLLAPSED, _name, null);
        }
        /**
         * Closes the youngest group
         */
        static groupEnd() {
            Debug.delegate(FudgeCore.DEBUG_FILTER.GROUPEND, null, null);
        }
        /**
         * Lookup all delegates registered to the filter and call them using the given arguments
         */
        static delegate(_filter, _message, _args) {
            let delegates = Debug.delegates[_filter];
            for (let delegate of delegates.values())
                if (_args && _args.length > 0)
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
        [FudgeCore.DEBUG_FILTER.ERROR]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.ERROR]]]),
        [FudgeCore.DEBUG_FILTER.CLEAR]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.CLEAR]]]),
        [FudgeCore.DEBUG_FILTER.GROUP]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.GROUP]]]),
        [FudgeCore.DEBUG_FILTER.GROUPCOLLAPSED]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.GROUPCOLLAPSED]]]),
        [FudgeCore.DEBUG_FILTER.GROUPEND]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.GROUPEND]]])
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
        static clear() {
            DebugTextArea.textArea.textContent = "";
            DebugTextArea.groups = [];
        }
        static group(_name) {
            DebugTextArea.print("▼ " + _name);
            DebugTextArea.groups.push(_name);
        }
        static groupEnd() {
            DebugTextArea.groups.pop();
        }
        static createDelegate(_headline) {
            let delegate = function (_message, ..._args) {
                DebugTextArea.print(_headline + " " + FudgeCore.DebugTarget.mergeArguments(_message, _args));
            };
            return delegate;
        }
        static getIndentation(_level) {
            let result = "";
            for (let i = 0; i < _level; i++)
                result += "| ";
            return result;
        }
        static print(_text) {
            DebugTextArea.textArea.textContent += DebugTextArea.getIndentation(DebugTextArea.groups.length) + _text + "\n";
        }
    }
    DebugTextArea.textArea = document.createElement("textarea");
    // Ⓘ Ⓛ Ⓦ Ⓔ ☠ ☢ ⚠ ✎ ✔ ✓ ❌ ⭍ ☈ 🛈
    DebugTextArea.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: DebugTextArea.createDelegate("✓"),
        [FudgeCore.DEBUG_FILTER.LOG]: DebugTextArea.createDelegate("✎"),
        [FudgeCore.DEBUG_FILTER.WARN]: DebugTextArea.createDelegate("⚠"),
        [FudgeCore.DEBUG_FILTER.ERROR]: DebugTextArea.createDelegate("❌"),
        [FudgeCore.DEBUG_FILTER.CLEAR]: DebugTextArea.clear,
        [FudgeCore.DEBUG_FILTER.GROUP]: DebugTextArea.group,
        [FudgeCore.DEBUG_FILTER.GROUPCOLLAPSED]: DebugTextArea.group,
        [FudgeCore.DEBUG_FILTER.GROUPEND]: DebugTextArea.groupEnd
    };
    DebugTextArea.groups = [];
    FudgeCore.DebugTextArea = DebugTextArea;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Defines a color as values in the range of 0 to 1 for the four channels red, green, blue and alpha (for opacity)
     */
    class Color extends FudgeCore.Mutable {
        constructor(_r = 1, _g = 1, _b = 1, _a = 1) {
            super();
            this.setNormRGBA(_r, _g, _b, _a);
        }
        static getHexFromCSSKeyword(_keyword) {
            Color.crc2.fillStyle = _keyword;
            return Color.crc2.fillStyle;
        }
        static CSS(_keyword, _alpha = 1) {
            let hex = Color.getHexFromCSSKeyword(_keyword);
            let color = new Color(parseInt(hex.substr(1, 2), 16) / 255, parseInt(hex.substr(3, 2), 16) / 255, parseInt(hex.substr(5, 2), 16) / 255, _alpha);
            return color;
        }
        static MULTIPLY(_color1, _color2) {
            return new Color(_color1.r * _color2.r, _color1.g * _color2.g, _color1.b * _color2.b, _color1.a * _color2.a);
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
        getArrayBytesRGBA() {
            return new Uint8ClampedArray([this.r * 255, this.g * 255, this.b * 255, this.a * 255]);
        }
        add(_color) {
            this.r += _color.r;
            this.g += _color.g;
            this.b += _color.b;
            this.a += _color.a;
        }
        getCSS() {
            let bytes = this.getArrayBytesRGBA();
            return `RGBA(${bytes[0]}, ${bytes[1]}, ${bytes[2]}, ${bytes[3]})`;
        }
        reduceMutator(_mutator) { }
    }
    // crc2 only used for converting colors from strings predefined by CSS
    Color.crc2 = document.createElement("canvas").getContext("2d");
    FudgeCore.Color = Color;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Baseclass for materials. Combines a [[Shader]] with a compatible [[Coat]]
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Material extends FudgeCore.Mutable {
        constructor(_name, _shader, _coat) {
            super();
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
        reduceMutator(_mutator) {
            //
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
        pointToRect(_point, _target) {
            let result = _point.copy;
            result.subtract(this.position);
            result.x *= _target.width / this.width;
            result.y *= _target.height / this.height;
            result.add(_target.position);
            return result;
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
        /**
         * Return the leftmost expansion, respecting also negative values of width
         */
        get left() {
            if (this.size.x > 0)
                return this.position.x;
            return (this.position.x + this.size.x);
        }
        /**
         * Return the topmost expansion, respecting also negative values of height
         */
        get top() {
            if (this.size.y > 0)
                return this.position.y;
            return (this.position.y + this.size.y);
        }
        /**
         * Return the rightmost expansion, respecting also negative values of width
         */
        get right() {
            if (this.size.x > 0)
                return (this.position.x + this.size.x);
            return this.position.x;
        }
        /**
         * Return the lowest expansion, respecting also negative values of height
         */
        get bottom() {
            if (this.size.y > 0)
                return (this.position.y + this.size.y);
            return this.position.y;
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
        get copy() {
            return Rectangle.GET(this.x, this.y, this.width, this.height);
        }
        /**
         * Returns true if the given point is inside of this rectangle or on the border
         * @param _point
         */
        isInside(_point) {
            return (_point.x >= this.left && _point.x <= this.right && _point.y >= this.top && _point.y <= this.bottom);
        }
        collides(_rect) {
            if (this.left > _rect.right)
                return false;
            if (this.right < _rect.left)
                return false;
            if (this.top > _rect.bottom)
                return false;
            if (this.bottom < _rect.top)
                return false;
            return true;
        }
        toString() {
            let result = `ƒ.Rectangle(position:${this.position.toString()}, size:${this.size.toString()}`;
            result += `, left:${this.left.toPrecision(5)}, top:${this.top.toPrecision(5)}, right:${this.right.toPrecision(5)}, bottom:${this.bottom.toPrecision(5)}`;
            return result;
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Rectangle = Rectangle;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Light/Light.ts"/>
/// <reference path="../Event/Event.ts"/>
/// <reference path="../Component/ComponentLight.ts"/>
/// <reference path="../Math/Rectangle.ts"/>
var FudgeCore;
/// <reference path="../Light/Light.ts"/>
/// <reference path="../Event/Event.ts"/>
/// <reference path="../Component/ComponentLight.ts"/>
/// <reference path="../Math/Rectangle.ts"/>
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
                let event = new FudgeCore.EventDragDrop("ƒ" + _event.type, _dragevent);
                this.addCanvasPosition(event);
                this.dispatchEvent(event);
            };
            /**
             * Handle pointer events and dispatch to viewport as FUDGE-Event
             */
            this.hndPointerEvent = (_event) => {
                let event = new FudgeCore.EventPointer("ƒ" + _event.type, _event);
                this.addCanvasPosition(event);
                this.dispatchEvent(event);
            };
            /**
             * Handle keyboard events and dispatch to viewport as FUDGE-Event, if the viewport has the focus
             */
            this.hndKeyboardEvent = (_event) => {
                if (!this.hasFocus)
                    return;
                let event = new FudgeCore.EventKeyboard("ƒ" + _event.type, _event);
                this.dispatchEvent(event);
            };
            /**
             * Handle wheel event and dispatch to viewport as FUDGE-Event
             */
            this.hndWheelEvent = (_event) => {
                let event = new FudgeCore.EventWheel("ƒ" + _event.type, _event);
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
            // FUDGE doesn't care about where the client rect is, only about the size matters.
            // return Rectangle.GET(this.canvas.offsetLeft, this.canvas.offsetTop, this.canvas.clientWidth, this.canvas.clientHeight);
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
            if (this.branch) {
                this.collectLights();
                this.branch.addEventListener("componentAdd" /* COMPONENT_ADD */, this.hndComponentEvent);
                this.branch.addEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndComponentEvent);
            }
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
            FudgeCore.Debug.log(this.pickBuffers[0].frameBuffer);
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
        /**
         * Returns a point on the source-rectangle matching the given point on the client rectangle
         */
        pointClientToSource(_client) {
            let result = this.frameClientToCanvas.getPoint(_client, this.getClientRectangle());
            result = this.frameCanvasToDestination.getPoint(result, this.getCanvasRectangle());
            result = this.frameDestinationToSource.getPoint(result, this.rectSource);
            //TODO: when Source, Render and RenderViewport deviate, continue transformation 
            return result;
        }
        /**
         * Returns a point on the render-rectangle matching the given point on the source rectangle
         */
        pointSourceToRender(_source) {
            let projectionRectangle = this.camera.getProjectionRectangle();
            let point = this.frameSourceToRender.getPoint(_source, projectionRectangle);
            return point;
        }
        /**
         * Returns a point on the render-rectangle matching the given point on the client rectangle
         */
        pointClientToRender(_client) {
            let point = this.pointClientToSource(_client);
            point = this.pointSourceToRender(point);
            //TODO: when Render and RenderViewport deviate, continue transformation 
            return point;
        }
        /**
         * Returns a point in normed view-rectangle matching the given point on the client rectangle
         * The view-rectangle matches the client size in the hypothetical distance of 1 to the camera, its origin in the center and y-axis pointing up
         * TODO: examine, if this should be a camera-method. Current implementation is for central-projection
         */
        pointClientToProjection(_client) {
            let posRender = this.pointClientToRender(_client);
            let rectRender = this.frameSourceToRender.getRect(this.rectSource);
            let rectProjection = this.camera.getProjectionRectangle();
            let posProjection = new FudgeCore.Vector2(rectProjection.width * posRender.x / rectRender.width, rectProjection.height * posRender.y / rectRender.height);
            posProjection.subtract(new FudgeCore.Vector2(rectProjection.width / 2, rectProjection.height / 2));
            posProjection.y *= -1;
            return posProjection;
        }
        /**
         * Returns a point in the client rectangle matching the given point in normed clipspace rectangle,
         * which stretches from -1 to 1 in both dimensions, y pointing up
         */
        pointClipToClient(_normed) {
            // let rectClient: Rectangle = this.getClientRectangle();
            // let result: Vector2 = Vector2.ONE(0.5);
            // result.x *= (_normed.x + 1) * rectClient.width;
            // result.y *= (1 - _normed.y) * rectClient.height;
            // result.add(rectClient.position);
            //TODO: check if rectDestination can be safely (and more perfomant) be used instead getClientRectangle
            let pointClient = FudgeCore.RenderManager.rectClip.pointToRect(_normed, this.rectDestination);
            return pointClient;
        }
        /**
         * Returns a point in the client rectangle matching the given point in normed clipspace rectangle,
         * which stretches from -1 to 1 in both dimensions, y pointing up
         */
        pointClipToCanvas(_normed) {
            let pointCanvas = FudgeCore.RenderManager.rectClip.pointToRect(_normed, this.getCanvasRectangle());
            return pointCanvas;
        }
        pointClientToScreen(_client) {
            let screen = new FudgeCore.Vector2(this.canvas.offsetLeft + _client.x, this.canvas.offsetTop + _client.y);
            return screen;
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
    class EventDragDrop extends DragEvent {
        constructor(type, _event) {
            super(type, _event);
            let target = _event.target;
            this.clientRect = target.getClientRects()[0];
            this.pointerX = _event.clientX - this.clientRect.left;
            this.pointerY = _event.clientY - this.clientRect.top;
        }
    }
    FudgeCore.EventDragDrop = EventDragDrop;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class EventKeyboard extends KeyboardEvent {
        constructor(type, _event) {
            super(type, _event);
        }
    }
    FudgeCore.EventKeyboard = EventKeyboard;
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
    class EventPointer extends PointerEvent {
        constructor(type, _event) {
            super(type, _event);
            let target = _event.target;
            this.clientRect = target.getClientRects()[0];
            this.pointerX = _event.clientX - this.clientRect.left;
            this.pointerY = _event.clientY - this.clientRect.top;
        }
    }
    FudgeCore.EventPointer = EventPointer;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class EventTimer {
        constructor(_timer, ..._arguments) {
            this.type = "\u0192lapse" /* CALL */;
            this.firstCall = true;
            this.lastCall = false;
            this.target = _timer;
            this.arguments = _arguments;
            this.firstCall = true;
        }
    }
    FudgeCore.EventTimer = EventTimer;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class EventWheel extends WheelEvent {
        constructor(type, _event) {
            super(type, _event);
        }
    }
    FudgeCore.EventWheel = EventWheel;
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
        constructor(_width = 300, _height = 150) {
            super();
            this.width = 300;
            this.height = 150;
            this.setSize(_width, _height);
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
     * Simple class for 3x3 matrix operations
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2020
     */
    class Matrix3x3 extends FudgeCore.Mutable {
        constructor() {
            super();
            this.data = new Float32Array(3); // The data of the matrix.
            this.mutator = null; // prepared for optimization, keep mutator to reduce redundant calculation and for comparison. Set to null when data changes!
            this.data = new Float32Array([
                1, 0, 0,
                0, 1, 0,
                0, 0, 1
            ]);
            this.resetCache();
        }
        /**
         * - get: a copy of the calculated translation vector
         * - set: effect the matrix ignoring its rotation and scaling
         */
        get translation() {
            if (!this.vectors.translation)
                this.vectors.translation = new FudgeCore.Vector2(this.data[6], this.data[7]);
            return this.vectors.translation.copy;
        }
        set translation(_translation) {
            this.data.set(_translation.get(), 12);
            // no full cache reset required
            this.vectors.translation = _translation;
            this.mutator = null;
        }
        /**
         * - get: a copy of the calculated rotation vector
         * - set: effect the matrix
         */
        get rotation() {
            if (!this.vectors.rotation)
                this.vectors.rotation = this.getEulerAngles();
            return this.vectors.rotation;
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
                this.vectors.scaling = new FudgeCore.Vector2(Math.hypot(this.data[0], this.data[1]), Math.hypot(this.data[3], this.data[4]));
            return this.vectors.scaling.copy;
        }
        set scaling(_scaling) {
            this.mutate({ "scaling": _scaling });
            this.resetCache();
        }
        //TODO: figure out what this is used for
        static PROJECTION(_width, _height) {
            let matrix = new Matrix3x3;
            matrix.data.set([
                2 / _width, 0, 0,
                0, -2 / _height, 0,
                -1, 1, 1
            ]);
            return matrix;
        }
        static get IDENTITY() {
            const result = FudgeCore.Recycler.get(Matrix3x3);
            result.data.set([
                1, 0, 0,
                0, 1, 0,
                0, 0, 1
            ]);
            return result;
        }
        /**
         * Returns a matrix that translates coordinates along the x-, y- and z-axis according to the given vector.
         */
        static TRANSLATION(_translate) {
            const matrix = FudgeCore.Recycler.get(Matrix3x3);
            matrix.data.set([
                1, 0, 0,
                0, 1, 0,
                _translate.x, _translate.y, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that rotates coordinates on the z-axis when multiplied by.
         * @param _angleInDegrees The value of the rotation.
         */
        static ROTATION(_angleInDegrees) {
            // const matrix: Matrix3x3 = new Matrix3x3;
            const matrix = FudgeCore.Recycler.get(Matrix3x3);
            let angleInRadians = _angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            matrix.data.set([
                cos, sin, 0,
                -sin, cos, 0,
                0, 0, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that scales coordinates along the x-, y- and z-axis according to the given vector
         */
        static SCALING(_scalar) {
            // const matrix: Matrix3x3 = new Matrix3x3;
            const matrix = FudgeCore.Recycler.get(Matrix3x3);
            matrix.data.set([
                _scalar.x, 0, 0,
                0, _scalar.y, 0,
                0, 0, 1
            ]);
            return matrix;
        }
        //#endregion
        static MULTIPLICATION(_a, _b) {
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
            matrix.data.set([
                b00 * a00 + b01 * a10 + b02 * a20,
                b00 * a01 + b01 * a11 + b02 * a21,
                b00 * a02 + b01 * a12 + b02 * a22,
                b10 * a00 + b11 * a10 + b12 * a20,
                b10 * a01 + b11 * a11 + b12 * a21,
                b10 * a02 + b11 * a12 + b12 * a22,
                b20 * a00 + b21 * a10 + b22 * a20,
                b20 * a01 + b21 * a11 + b22 * a21,
                b20 * a02 + b21 * a12 + b22 * a22
            ]);
            return matrix;
        }
        //#region Translation
        /**
         * Add a translation by the given vector to this matrix
         */
        translate(_by) {
            const matrix = Matrix3x3.MULTIPLICATION(this, Matrix3x3.TRANSLATION(_by));
            // TODO: possible optimization, translation may alter mutator instead of deleting it.
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Add a translation along the x-Axis by the given amount to this matrix
         */
        translateX(_x) {
            this.data[6] += _x;
            this.mutator = null;
            this.vectors.translation = null;
        }
        /**
         * Add a translation along the y-Axis by the given amount to this matrix
         */
        translateY(_y) {
            this.data[7] += _y;
            this.mutator = null;
            this.vectors.translation = null;
        }
        //#endregion
        //#region Scaling
        /**
         * Add a scaling by the given vector to this matrix
         */
        scale(_by) {
            const matrix = Matrix3x3.MULTIPLICATION(this, Matrix3x3.SCALING(_by));
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Add a scaling along the x-Axis by the given amount to this matrix
         */
        scaleX(_by) {
            this.scale(new FudgeCore.Vector2(_by, 1));
        }
        /**
         * Add a scaling along the y-Axis by the given amount to this matrix
         */
        scaleY(_by) {
            this.scale(new FudgeCore.Vector2(1, _by));
        }
        //#endregion
        //#region Rotation
        /**
         * Adds a rotation around the z-Axis to this matrix
         */
        rotate(_angleInDegrees) {
            const matrix = Matrix3x3.MULTIPLICATION(this, Matrix3x3.ROTATION(_angleInDegrees));
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        //#endregion
        //#region Transformation
        /**
         * Multiply this matrix with the given matrix
         */
        multiply(_matrix) {
            this.set(Matrix3x3.MULTIPLICATION(this, _matrix));
            this.mutator = null;
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
            let s3 = this.data[3] / scaling.y;
            let s4 = this.data[4] / scaling.y;
            let xSkew = Math.atan2(-s3, s4);
            let ySkew = Math.atan2(s0, s1);
            let sy = Math.hypot(s0, s1); // probably 2. param should be this.data[4] / scaling.y
            let rotation;
            if (!(sy > 1e-6))
                rotation = ySkew;
            else
                rotation = xSkew;
            rotation *= 180 / Math.PI;
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
        toString() {
            return `ƒ.Matrix3x3(translation: ${this.translation.toString()}, rotation: ${this.rotation.toString()}, scaling: ${this.scaling.toString()}`;
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
                rotation: this.rotation,
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
                vectors.translation = new FudgeCore.Vector2(newTranslation.x != undefined ? newTranslation.x : oldTranslation.x, newTranslation.y != undefined ? newTranslation.y : oldTranslation.y);
            }
            vectors.rotation = (newRotation == undefined) ? oldRotation : newRotation;
            if (newScaling) {
                vectors.scaling = new FudgeCore.Vector2(newScaling.x != undefined ? newScaling.x : oldScaling.x, newScaling.y != undefined ? newScaling.y : oldScaling.y);
            }
            // TODO: possible performance optimization when only one or two components change, then use old matrix instead of IDENTITY and transform by differences/quotients
            let matrix = Matrix3x3.IDENTITY;
            if (vectors.translation)
                matrix.translate(vectors.translation);
            if (vectors.rotation) {
                matrix.rotate(vectors.rotation);
            }
            if (vectors.scaling)
                matrix.scale(vectors.scaling);
            this.set(matrix);
            this.vectors = vectors;
        }
        getMutatorAttributeTypes(_mutator) {
            let types = {};
            if (_mutator.translation)
                types.translation = "Vector2";
            if (_mutator.rotation)
                types.rotation = "number";
            if (_mutator.scaling)
                types.scaling = "Vector2";
            return types;
        }
        reduceMutator(_mutator) { }
        resetCache() {
            this.vectors = { translation: null, rotation: null, scaling: null };
            this.mutator = null;
        }
    }
    FudgeCore.Matrix3x3 = Matrix3x3;
    //#endregion
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
            this.vectors.translation = null;
        }
        /**
         * Add a translation along the y-Axis by the given amount to this matrix
         */
        translateY(_y) {
            this.data[13] += _y;
            this.mutator = null;
            this.vectors.translation = null;
        }
        /**
         * Add a translation along the y-Axis by the given amount to this matrix
         */
        translateZ(_z) {
            this.data[14] += _z;
            this.mutator = null;
            this.vectors.translation = null;
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
        toString() {
            return `ƒ.Matrix4x4(translation: ${this.translation.toString()}, rotation: ${this.rotation.toString()}, scaling: ${this.scaling.toString()}`;
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
     * Class for creating random values, supporting Javascript's Math.random and a deterministig pseudo-random number generator (PRNG)
     * that can be fed with a seed and then returns a reproducable set of random numbers (if the precision of Javascript allows)
     *
     * @author Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Random {
        /**
         * Create an instance of [[Random]]. If desired, creates a PRNG with it and feeds the given seed.
         * @param _ownGenerator
         * @param _seed
         */
        constructor(_ownGenerator = false, _seed = Math.random()) {
            this.generate = Math.random;
            if (_ownGenerator)
                this.generate = Random.createGenerator(_seed);
        }
        /**
         * Creates a dererminstic PRNG with the given seed
         */
        static createGenerator(_seed) {
            // TODO: replace with random number generator to generate predictable sequence
            return Math.random;
        }
        /**
         * Returns a normed random number, thus in the range of [0, 1[
         */
        getNorm() {
            return this.generate();
        }
        /**
         * Returns a random number in the range of given [_min, _max[
         */
        getRange(_min, _max) {
            return _min + this.generate() * (_max - _min);
        }
        /**
         * Returns a random integer number in the range of given floored [_min, _max[
         */
        getRangeFloored(_min, _max) {
            return Math.floor(this.getRange(_min, _max));
        }
        /**
         * Returns true or false randomly
         */
        getBoolean() {
            return this.generate() < 0.5;
        }
        /**
         * Returns -1 or 1 randomly
         */
        getSign() {
            return this.getBoolean() ? 1 : -1;
        }
        /**
         * Returns a randomly selected index into the given array
         */
        getIndex(_array) {
            if (_array.length > 0)
                return this.getRangeFloored(0, _array.length);
            return -1;
        }
        /**
         * Returns removes a randomly selected element from the given array and returns it
         */
        splice(_array) {
            return _array.splice(this.getIndex(_array), 1)[0];
        }
        /**
         * Returns a randomly selected key from the given Map-instance
         */
        getKey(_map) {
            let keys = Array.from(_map.keys());
            return keys[this.getIndex(keys)];
        }
        /**
         * Returns a randomly selected property name from the given object
         */
        getPropertyName(_object) {
            let keys = Object.getOwnPropertyNames(_object);
            return keys[this.getIndex(keys)];
        }
        /**
         * Returns a randomly selected symbol from the given object, if symbols are used as keys
         */
        getPropertySymbol(_object) {
            let keys = Object.getOwnPropertySymbols(_object);
            return keys[this.getIndex(keys)];
        }
    }
    Random.default = new Random();
    FudgeCore.Random = Random;
    /**
     * Standard [[Random]]-instance using Math.random().
     */
    FudgeCore.random = new Random();
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Stores and manipulates a twodimensional vector comprised of the components x and y
     * ```plaintext
     *            +y
     *             |__ +x
     * ```
     * @authors Lukas Scheuerle, Jirka Dell'Oro-Friedl, HFU, 2019
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
         * Returns the length of the vector
         */
        get magnitude() {
            return Math.hypot(...this.data);
        }
        /**
         * Returns the square of the magnitude of the vector without calculating a square root. Faster for simple proximity evaluation.
         */
        get magnitudeSquared() {
            return Vector2.DOT(this, this);
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
        static TRANSFORMATION(_vector, _matrix, _includeTranslation = true) {
            let result = new Vector2();
            let m = _matrix.get();
            let [x, y] = _vector.get();
            result.x = m[0] * x + m[3] * y;
            result.y = m[1] * x + m[4] * y;
            if (_includeTranslation) {
                result.add(_matrix.translation);
            }
            return result;
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
            let vector = new Vector2(_vector.x * _scale, _vector.y * _scale);
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
         * ↑ => ← => ↓ => → => ↑
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
         * Returns true if the coordinates of this and the given vector are to be considered identical within the given tolerance
         * TODO: examine, if tolerance as criterium for the difference is appropriate with very large coordinate values or if _tolerance should be multiplied by coordinate value
         */
        equals(_compare, _tolerance = Number.EPSILON) {
            if (Math.abs(this.x - _compare.x) > _tolerance)
                return false;
            if (Math.abs(this.y - _compare.y) > _tolerance)
                return false;
            return true;
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
        transform(_matrix, _includeTranslation = true) {
            this.data = Vector2.TRANSFORMATION(this, _matrix, _includeTranslation).data;
        }
        /**
         * Adds a z-component to the vector and returns a new Vector3
         */
        toVector3() {
            return new FudgeCore.Vector3(this.x, this.y, 0);
        }
        toString() {
            let result = `(${this.x.toPrecision(5)}, ${this.y.toPrecision(5)})`;
            return result;
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
        /**
         * Returns the length of the vector
         */
        get magnitude() {
            return Math.hypot(...this.data);
        }
        /**
         * Returns the square of the magnitude of the vector without calculating a square root. Faster for simple proximity evaluation.
         */
        get magnitudeSquared() {
            return Vector3.DOT(this, this);
        }
        /**
         * Creates and returns a vector with the given length pointing in x-direction
         */
        static X(_scale = 1) {
            const vector = new Vector3(_scale, 0, 0);
            return vector;
        }
        /**
         * Creates and returns a vector with the given length pointing in y-direction
         */
        static Y(_scale = 1) {
            const vector = new Vector3(0, _scale, 0);
            return vector;
        }
        /**
         * Creates and returns a vector with the given length pointing in z-direction
         */
        static Z(_scale = 1) {
            const vector = new Vector3(0, 0, _scale);
            return vector;
        }
        /**
         * Creates and returns a vector with the value 0 on each axis
         */
        static ZERO() {
            const vector = new Vector3(0, 0, 0);
            return vector;
        }
        /**
         * Creates and returns a vector of the given size on each of the three axis
         */
        static ONE(_scale = 1) {
            const vector = new Vector3(_scale, _scale, _scale);
            return vector;
        }
        /**
         * Creates and returns a vector through transformation of the given vector by the given matrix
         */
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
        /**
         * Creates and returns a vector which is a copy of the given vector scaled to the given length
         */
        static NORMALIZATION(_vector, _length = 1) {
            let vector = Vector3.ZERO();
            try {
                let factor = _length / _vector.magnitude;
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
        /**
         * Returns true if the coordinates of this and the given vector are to be considered identical within the given tolerance
         * TODO: examine, if tolerance as criterium for the difference is appropriate with very large coordinate values or if _tolerance should be multiplied by coordinate value
         */
        equals(_compare, _tolerance = Number.EPSILON) {
            if (Math.abs(this.x - _compare.x) > _tolerance)
                return false;
            if (Math.abs(this.y - _compare.y) > _tolerance)
                return false;
            if (Math.abs(this.z - _compare.z) > _tolerance)
                return false;
            return true;
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
            let result = `(${this.x.toPrecision(5)}, ${this.y.toPrecision(5)}, ${this.z.toPrecision(5)})`;
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
                /*0*/ 0, 0, 1, /*1*/ 0, 0, 0, /*2*/ 0, 0, 0, /*3*/ 0, 0, 0
            ]);
        }
    }
    FudgeCore.MeshQuad = MeshQuad;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Generate two quads placed back to back, the one facing in negative Z-direction is textured reversed
     * ```plaintext
     *        0 __ 3
     *         |__|
     *        1    2
     * ```
     * @authors Jirka Dell'Oro-Friedl, HFU, 2020
     */
    class MeshSprite extends FudgeCore.Mesh {
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
                1, 2, 0, 2, 3, 0,
                0, 3, 1, 3, 2, 1 //back
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
                /*0: normal of front face*/
                0, 0, 1,
                /*1: normal of back face*/
                0, 0, -1,
                /*2*/
                0, 0, 0,
                /*3*/
                0, 0, 0
            ]);
        }
    }
    FudgeCore.MeshSprite = MeshSprite;
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
            this.active = true;
            this.name = _name;
        }
        activate(_on) {
            this.active = _on;
            this.dispatchEvent(new Event(_on ? "componentActivate" /* COMPONENT_ACTIVATE */ : "componentDeactivate" /* COMPONENT_DEACTIVATE */));
        }
        get isActive() {
            return this.active;
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
            let inAudioBranch = false;
            let ancestor = this;
            while (ancestor) {
                ancestor.timestampUpdate = 0;
                inAudioBranch = inAudioBranch || (ancestor == FudgeCore.AudioManager.default.getBranchListeningTo());
                if (ancestor == _node)
                    throw (new Error("Cyclic reference prohibited in node hierarchy, ancestors must not be added as children"));
                else
                    ancestor = ancestor.parent;
            }
            let previousParent = _node.parent;
            if (previousParent)
                previousParent.removeChild(_node);
            this.children.push(_node);
            _node.parent = this;
            _node.dispatchEvent(new Event("childAppend" /* CHILD_APPEND */, { bubbles: true }));
            if (inAudioBranch)
                _node.broadcastEvent(new Event("childAppendToAudioBranch" /* CHILD_APPEND */));
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
            if (this.isDescendantOf(FudgeCore.AudioManager.default.getBranchListeningTo()))
                _node.broadcastEvent(new Event("childRemoveFromAudioBranch" /* CHILD_REMOVE */));
            this.children.splice(found, 1);
            _node.parent = null;
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
            _replace.parent = null;
            this.children[found] = _with;
            _with.parent = this;
            _with.dispatchEvent(new Event("childAppend" /* CHILD_APPEND */, { bubbles: true }));
            if (this.isDescendantOf(FudgeCore.AudioManager.default.getBranchListeningTo()))
                _with.broadcastEvent(new Event("childAppendToAudioBranch" /* CHILD_APPEND */));
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
        isDescendantOf(_ancestor) {
            let node = this;
            while (node && node != _ancestor)
                node = node.parent;
            return (node != null);
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
                _component.dispatchEvent(new Event("componentRemove" /* COMPONENT_REMOVE */));
                componentsOfType.splice(foundAt, 1);
                _component.setContainer(null);
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
            let listListeners = _capture ? this.captures : this.listeners;
            if (!listListeners[_type])
                listListeners[_type] = [];
            listListeners[_type].push(_handler);
        }
        /**
         * Removes an event listener from the node. The signatur must match the one used with addEventListener
         * @param _type The type of the event, should be an enumerated value of NODE_EVENT, can be any string
         * @param _handler The function to call when the event reaches this node
         * @param _capture When true, the listener listens in the capture phase, when the event travels deeper into the hierarchy of nodes.
         */
        removeEventListener(_type, _handler, _capture = false) {
            let listenersForType = _capture ? this.captures[_type] : this.listeners[_type];
            if (listenersForType)
                for (let i = listenersForType.length - 1; i >= 0; i--)
                    if (listenersForType[i] == _handler)
                        listenersForType.splice(i, 1);
        }
        /**
         * Dispatches a synthetic event to target. This implementation always returns true (standard: return true only if either event's cancelable attribute value is false or its preventDefault() method was not invoked)
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
         * Broadcasts a synthetic event to this node and from there to all nodes deeper in the hierarchy,
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
            if (!_node.isActive)
                return;
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
            //TODO: examine, why switching blendFunction is necessary 
            FudgeCore.RenderOperator.crc3.blendFunc(1, 0);
            RenderManager.drawBranch(_node, _cmpCamera, RenderManager.drawNodeForRayCast);
            FudgeCore.RenderOperator.crc3.blendFunc(WebGL2RenderingContext.DST_ALPHA, WebGL2RenderingContext.ONE_MINUS_DST_ALPHA);
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
                // let zBuffer: number = data[4 * pixel + 1] + data[4 * pixel + 2] / 256;
                let zBuffer = data[4 * pixel + 0];
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
    RenderManager.rectClip = new FudgeCore.Rectangle(-1, 1, 2, -2);
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
                        v_color.a = 1.0;
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
                       frag = vec4(gl_FragCoord.z, upperbyte, lowerbyte, 1.0);
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
                uniform mat3 u_pivot;
                out vec2 v_textureUVs;

                void main() {  
                    gl_Position = u_projection * vec4(a_position, 1.0);
                    // v_textureUVs = a_textureUVs;
                    v_textureUVs = vec2(u_pivot * vec3(a_textureUVs, 1.0)).xy;
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
                    if (frag.a < 0.01)
                      discard;
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
     * Supports [[Timer]]s similar to window.setInterval but with respect to the scaled time.
     * All time values are given in milliseconds
     *
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
        // public static get game(): Time {
        //   return Time.gameTime;
        // }
        static getUnits(_milliseconds) {
            let units = {};
            units.asSeconds = _milliseconds / 1000;
            units.asMinutes = units.asSeconds / 60;
            units.asHours = units.asMinutes / 60;
            units.hours = Math.floor(units.asHours);
            units.minutes = Math.floor(units.asMinutes) % 60;
            units.seconds = Math.floor(units.asSeconds) % 60;
            units.fraction = _milliseconds % 1000;
            units.thousands = _milliseconds % 10;
            units.hundreds = _milliseconds % 100 - units.thousands;
            units.tenths = units.fraction - units.hundreds - units.thousands;
            return units;
        }
        //#region Get/Set time and scaling
        /**
         * Retrieves the current scaled timestamp of this instance in milliseconds
         */
        get() {
            return this.offset + this.scale * (performance.now() - this.start);
        }
        /**
         * Returns the remaining time to the given point of time
         */
        getRemainder(_to) {
            return _to - this.get();
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
        //#endregion
        //#region Timers
        /**
         * Returns a Promise<void> to be resolved after the time given. To be used with async/await
         */
        delay(_lapse) {
            return new Promise(_resolve => this.setTimer(_lapse, 1, () => _resolve()));
        }
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
         * @param _handler The function to call each the given lapse has elapsed
         * @param _arguments Additional parameters to pass to callback function
         */
        setTimer(_lapse, _count, _handler, ..._arguments) {
            let timer = new FudgeCore.Timer(this, _lapse, _count, _handler, _arguments);
            this.timers[++this.idTimerNext] = timer;
            return this.idTimerNext;
        }
        /**
         * Deletes the timer with the id given by this time object
         */
        deleteTimer(_id) {
            console.log(this.timers[_id]);
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
        /**
         * Returns true if there are [[Timers]] installed to this
         */
        hasTimers() {
            return (Object.keys(this.timers).length > 0);
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
                this.timers[id] = timer.installCopy();
            }
        }
    }
    /** Standard game time starting automatically with the application */
    Time.game = new Time();
    FudgeCore.Time = Time;
    //#endregion
    /**
     * Standard [[Time]]-instance. Starts running when Fudge starts up and may be used as the main game-time object
     */
    FudgeCore.time = Time.game; // TODO: eliminate Time.gameTime and use time solely
})(FudgeCore || (FudgeCore = {}));
///<reference path="../Event/Event.ts"/>
///<reference path="../Time/Time.ts"/>
var FudgeCore;
///<reference path="../Event/Event.ts"/>
///<reference path="../Time/Time.ts"/>
(function (FudgeCore) {
    /**
     * Determines the mode a loop runs in
     */
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
     *
     * @author Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Loop extends FudgeCore.EventTargetStatic {
        /**
         * Starts the loop with the given mode and fps
         * @param _mode
         * @param _fps Is only applicable in TIME-modes
         * @param _syncWithAnimationFrame Experimental and only applicable in TIME-modes. Should defer the loop-cycle until the next possible animation frame.
         */
        static start(_mode = LOOP_MODE.FRAME_REQUEST, _fps = 60, _syncWithAnimationFrame = false) {
            //Loop.stop();
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
                    console.log("STOP");
                    console.log(Loop.idIntervall);
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
    /**
     * A [[Timer]]-instance internally uses window.setInterval to call a given handler with a given frequency a given number of times,
     * passing an [[TimerEventƒ]]-instance with additional information and given arguments.
     * The frequency scales with the [[Time]]-instance the [[Timer]]-instance is attached to.
     *
     * @author Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Timer {
        /**
         * Creates a [[Timer]] instance.
         * @param _time The [[Time]] instance, the timer attaches to
         * @param _elapse The time in milliseconds to elapse, to the next call of _handler, measured in _time
         * @param _count The desired number of calls to _handler, Timer deinstalls automatically after last call. Passing 0 invokes infinite calls
         * @param _handler The [[TimerHandler]] instance to call
         * @param _arguments Additional arguments to pass to _handler
         */
        constructor(_time, _elapse, _count, _handler, ..._arguments) {
            this.time = _time;
            this.elapse = _elapse;
            this.event = new FudgeCore.EventTimer(this, _arguments);
            this.handler = _handler;
            this.count = _count;
            let scale = Math.abs(_time.getScale());
            if (!scale) {
                // Time is stopped, timer won't be active
                this.active = false;
                return;
            }
            this.timeoutReal = this.elapse / scale;
            let callback = () => {
                this.event.lastCall = (this.count == 1);
                _handler(this.event);
                this.event.firstCall = false;
                if (this.count > 0)
                    if (--this.count == 0)
                        _time.deleteTimerByItsInternalId(this.idWindow);
            };
            this.idWindow = window.setInterval(callback, this.timeoutReal, _arguments);
            this.active = true;
        }
        /**
         * Returns the window-id of the timer, which was returned by setInterval
         */
        get id() {
            return this.idWindow;
        }
        /**
         * Returns the time-intervall for calls to the handler
         */
        get lapse() {
            return this.elapse;
        }
        /**
         * Attaches a copy of this at its current state to the same [[Time]]-instance. Used internally when rescaling [[Time]]
         */
        installCopy() {
            return new Timer(this.time, this.elapse, this.count, this.handler, this.event.arguments);
        }
        /**
         * Clears the timer, removing it from the interval-timers handled by window
         */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnVkZ2VDb3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vU291cmNlL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHMiLCIuLi9Tb3VyY2UvRXZlbnQvRXZlbnQudHMiLCIuLi9Tb3VyY2UvVHJhbnNmZXIvTXV0YWJsZS50cyIsIi4uL1NvdXJjZS9BbmltYXRpb24vQW5pbWF0aW9uLnRzIiwiLi4vU291cmNlL0FuaW1hdGlvbi9BbmltYXRpb25GdW5jdGlvbi50cyIsIi4uL1NvdXJjZS9BbmltYXRpb24vQW5pbWF0aW9uS2V5LnRzIiwiLi4vU291cmNlL0FuaW1hdGlvbi9BbmltYXRpb25TZXF1ZW5jZS50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpby50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpb0RlbGF5LnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvRmlsdGVyLnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvTG9jYWxpc2F0aW9uLnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvTWFuYWdlci50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpb09zY2lsbGF0b3IudHMiLCIuLi9Tb3VyY2UvQXVkaW8vQXVkaW9TZXNzaW9uRGF0YS50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpb1NldHRpbmdzLnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvWC50cyIsIi4uL1NvdXJjZS9SZW5kZXIvUmVuZGVySW5qZWN0b3IudHMiLCIuLi9Tb3VyY2UvUmVuZGVyL1JlbmRlck9wZXJhdG9yLnRzIiwiLi4vU291cmNlL0NvYXQvQ29hdC50cyIsIi4uL1NvdXJjZS9Db2F0L0NvYXRUZXh0dXJlZC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50LnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRBbmltYXRvci50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50QXVkaW8udHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudEF1ZGlvTGlzdGVuZXIudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudEF1ZGlvWC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50Q2FtZXJhLnRzIiwiLi4vU291cmNlL0xpZ2h0L0xpZ2h0LnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRMaWdodC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50TWF0ZXJpYWwudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudE1lc2gudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudFNjcmlwdC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50VHJhbnNmb3JtLnRzIiwiLi4vU291cmNlL0RlYnVnL0RlYnVnSW50ZXJmYWNlcy50cyIsIi4uL1NvdXJjZS9EZWJ1Zy9EZWJ1Z1RhcmdldC50cyIsIi4uL1NvdXJjZS9EZWJ1Zy9EZWJ1Z0FsZXJ0LnRzIiwiLi4vU291cmNlL0RlYnVnL0RlYnVnQ29uc29sZS50cyIsIi4uL1NvdXJjZS9EZWJ1Zy9EZWJ1Zy50cyIsIi4uL1NvdXJjZS9EZWJ1Zy9EZWJ1Z0RpYWxvZy50cyIsIi4uL1NvdXJjZS9EZWJ1Zy9EZWJ1Z1RleHRBcmVhLnRzIiwiLi4vU291cmNlL0VuZ2luZS9Db2xvci50cyIsIi4uL1NvdXJjZS9FbmdpbmUvTWF0ZXJpYWwudHMiLCIuLi9Tb3VyY2UvRW5naW5lL1JlY3ljbGVyLnRzIiwiLi4vU291cmNlL0VuZ2luZS9SZXNvdXJjZU1hbmFnZXIudHMiLCIuLi9Tb3VyY2UvTWF0aC9SZWN0YW5nbGUudHMiLCIuLi9Tb3VyY2UvRW5naW5lL1ZpZXdwb3J0LnRzIiwiLi4vU291cmNlL0V2ZW50L0V2ZW50QXVkaW8udHMiLCIuLi9Tb3VyY2UvRXZlbnQvRXZlbnREcmFnRHJvcC50cyIsIi4uL1NvdXJjZS9FdmVudC9FdmVudEtleWJvYXJkLnRzIiwiLi4vU291cmNlL0V2ZW50L0V2ZW50UG9pbnRlci50cyIsIi4uL1NvdXJjZS9FdmVudC9FdmVudFRpbWVyLnRzIiwiLi4vU291cmNlL0V2ZW50L0V2ZW50V2hlZWwudHMiLCIuLi9Tb3VyY2UvTWF0aC9GcmFtaW5nLnRzIiwiLi4vU291cmNlL01hdGgvTWF0cml4M3gzLnRzIiwiLi4vU291cmNlL01hdGgvTWF0cml4NHg0LnRzIiwiLi4vU291cmNlL01hdGgvUmFuZG9tLnRzIiwiLi4vU291cmNlL01hdGgvVmVjdG9yMi50cyIsIi4uL1NvdXJjZS9NYXRoL1ZlY3RvcjMudHMiLCIuLi9Tb3VyY2UvTWVzaC9NZXNoLnRzIiwiLi4vU291cmNlL01lc2gvTWVzaEN1YmUudHMiLCIuLi9Tb3VyY2UvTWVzaC9NZXNoUHlyYW1pZC50cyIsIi4uL1NvdXJjZS9NZXNoL01lc2hRdWFkLnRzIiwiLi4vU291cmNlL01lc2gvTWVzaFNwcml0ZS50cyIsIi4uL1NvdXJjZS9Ob2RlL05vZGUudHMiLCIuLi9Tb3VyY2UvTm9kZS9Ob2RlUmVzb3VyY2UudHMiLCIuLi9Tb3VyY2UvTm9kZS9Ob2RlUmVzb3VyY2VJbnN0YW5jZS50cyIsIi4uL1NvdXJjZS9SYXkvUmF5LnRzIiwiLi4vU291cmNlL1JheS9SYXlIaXQudHMiLCIuLi9Tb3VyY2UvUmVuZGVyL1JlbmRlck1hbmFnZXIudHMiLCIuLi9Tb3VyY2UvU2hhZGVyL1NoYWRlci50cyIsIi4uL1NvdXJjZS9TaGFkZXIvU2hhZGVyRmxhdC50cyIsIi4uL1NvdXJjZS9TaGFkZXIvU2hhZGVyTWF0Q2FwLnRzIiwiLi4vU291cmNlL1NoYWRlci9TaGFkZXJSYXlDYXN0LnRzIiwiLi4vU291cmNlL1NoYWRlci9TaGFkZXJUZXh0dXJlLnRzIiwiLi4vU291cmNlL1NoYWRlci9TaGFkZXJVbmlDb2xvci50cyIsIi4uL1NvdXJjZS9UZXh0dXJlL1RleHR1cmUudHMiLCIuLi9Tb3VyY2UvVGltZS9UaW1lLnRzIiwiLi4vU291cmNlL1RpbWUvTG9vcC50cyIsIi4uL1NvdXJjZS9UaW1lL1RpbWVyLnRzIiwiLi4vU291cmNlL1RyYW5zZmVyL0ZpbGVJb0Jyb3dzZXJM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QUMsQ0FBQztRQUN6QixDQUFDOztJQTVGRDs7T0FFRztJQUNILDREQUE0RDtJQUM3QyxlQUFTLEdBQW1EO1FBQ3pFLENBQUMsVUFBQSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQUEsWUFBWSxFQUFFLFVBQUEsWUFBWSxDQUFDLFNBQVMsQ0FBQyxVQUFBLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekYsQ0FBQyxVQUFBLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBQSxZQUFZLEVBQUUsVUFBQSxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQUEsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RixDQUFDLFVBQUEsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFBLFlBQVksRUFBRSxVQUFBLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBQSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLENBQUMsVUFBQSxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQUEsWUFBWSxFQUFFLFVBQUEsWUFBWSxDQUFDLFNBQVMsQ0FBQyxVQUFBLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsQ0FBQyxVQUFBLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBQSxZQUFZLEVBQUUsVUFBQSxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQUEsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRixDQUFDLFVBQUEsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFBLFlBQVksRUFBRSxVQUFBLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFB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Q0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2FBQ1IsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNELFlBQVk7UUFHTCxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQWEsRUFBRSxFQUFhO1lBQ3ZELElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksTUFBTSxHQUFjLElBQUksU0FBUyxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUNkLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDakMsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUNqQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQ2pDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdB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QUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQ2I7Z0JBQ0UsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7YUFDOUMsQ0FBQyxDQUFDO1lBQ0wsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVEOzs7V0FHRztRQUNJLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBa0I7WUFDeEMsSUFBSSxDQUFDLEdBQWlCLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDbkMsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFFOUIsSUFBSSxFQUFFLEdBQVcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztnQkFDckQsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBRXpDLElBQUksRUFBRSxHQUFXLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUM7Z0JBQ3JELENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN6QyxJQUFJLEVBQUUsR0FBVyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDO2dCQUN0RCxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDMUMsSUFBSSxFQUFFLEdBQVcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztnQkFDdEQsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBRTFDLElBQUksQ0FBQyxHQUFXLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUVsRSx5Q0FBeUM7WUFDekMsTUFBTSxNQUFNLEdBQWMsVUFBQSxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUNkLENBQUMsR0FBRyxFQUFFO2dCQUNOLENBQUMsR0FBRyxFQUFFO2dCQUNOLENBQUMsR0FBRyxFQUFFO2dCQUNOLENBQUMsR0FBRyxFQUFFO2dCQUNOLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3JGLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3JGLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZGLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUss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LDRCQUFrQixxQkF1RDlCLENBQUE7QUFDTCxDQUFDLEVBaEVTLFNBQVMsS0FBVCxTQUFTLFFBZ0VsQiIsInNvdXJjZXNDb250ZW50IjpbIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1hbnlcclxuICAgIGV4cG9ydCB0eXBlIEdlbmVyYWwgPSBhbnk7XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICBbdHlwZTogc3RyaW5nXTogR2VuZXJhbDtcclxuICAgIH1cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbjtcclxuICAgICAgICBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZTtcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgTmFtZXNwYWNlUmVnaXN0ZXIge1xyXG4gICAgICAgIFtuYW1lOiBzdHJpbmddOiBPYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIYW5kbGVzIHRoZSBleHRlcm5hbCBzZXJpYWxpemF0aW9uIGFuZCBkZXNlcmlhbGl6YXRpb24gb2YgW1tTZXJpYWxpemFibGVdXSBvYmplY3RzLiBUaGUgaW50ZXJuYWwgcHJvY2VzcyBpcyBoYW5kbGVkIGJ5IHRoZSBvYmplY3RzIHRoZW1zZWx2ZXMuICBcclxuICAgICAqIEEgW1tTZXJpYWxpemF0aW9uXV0gb2JqZWN0IGNhbiBiZSBjcmVhdGVkIGZyb20gYSBbW1NlcmlhbGl6YWJsZV1dIG9iamVjdCBhbmQgYSBKU09OLVN0cmluZyBtYXkgYmUgY3JlYXRlZCBmcm9tIHRoYXQuICBcclxuICAgICAqIFZpY2UgdmVyc2EsIGEgSlNPTi1TdHJpbmcgY2FuIGJlIHBhcnNlZCB0byBhIFtbU2VyaWFsaXphdGlvbl1dIHdoaWNoIGNhbiBiZSBkZXNlcmlhbGl6ZWQgdG8gYSBbW1NlcmlhbGl6YWJsZV1dIG9iamVjdC5cclxuICAgICAqIGBgYHBsYWludGV4dFxyXG4gICAgICogIFtTZXJpYWxpemFibGVdIOKGkiAoc2VyaWFsaXplKSDihpIgW1NlcmlhbGl6YXRpb25dIOKGkiAoc3RyaW5naWZ5KSAgXHJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4oaTXHJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3RyaW5nXVxyXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKGk1xyXG4gICAgICogIFtTZXJpYWxpemFibGVdIOKGkCAoZGVzZXJpYWxpemUpIOKGkCBbU2VyaWFsaXphdGlvbl0g4oaQIChwYXJzZSlcclxuICAgICAqIGBgYCAgICAgIFxyXG4gICAgICogV2hpbGUgdGhlIGludGVybmFsIHNlcmlhbGl6ZS9kZXNlcmlhbGl6ZSBtZXRob2RzIG9mIHRoZSBvYmplY3RzIGNhcmUgb2YgdGhlIHNlbGVjdGlvbiBvZiBpbmZvcm1hdGlvbiBuZWVkZWQgdG8gcmVjcmVhdGUgdGhlIG9iamVjdCBhbmQgaXRzIHN0cnVjdHVyZSwgIFxyXG4gICAgICogdGhlIFtbU2VyaWFsaXplcl1dIGtlZXBzIHRyYWNrIG9mIHRoZSBuYW1lc3BhY2VzIGFuZCBjbGFzc2VzIGluIG9yZGVyIHRvIHJlY3JlYXRlIFtbU2VyaWFsaXphYmxlXV0gb2JqZWN0cy4gVGhlIGdlbmVyYWwgc3RydWN0dXJlIG9mIGEgW1tTZXJpYWxpemF0aW9uXV0gaXMgYXMgZm9sbG93cyAgXHJcbiAgICAgKiBgYGBwbGFpbnRleHRcclxuICAgICAqIHtcclxuICAgICAqICAgICAgbmFtZXNwYWNlTmFtZS5jbGFzc05hbWU6IHtcclxuICAgICAqICAgICAgICAgIHByb3BlcnR5TmFtZTogcHJvcGVydHlWYWx1ZSxcclxuICAgICAqICAgICAgICAgIC4uLixcclxuICAgICAqICAgICAgICAgIHByb3BlcnR5TmFtZU9mUmVmZXJlbmNlOiBTZXJpYWxpemF0aW9uT2ZUaGVSZWZlcmVuY2VkT2JqZWN0LFxyXG4gICAgICogICAgICAgICAgLi4uLFxyXG4gICAgICogICAgICAgICAgY29uc3RydWN0b3JOYW1lT2ZTdXBlcmNsYXNzOiBTZXJpYWxpemF0aW9uT2ZTdXBlckNsYXNzXHJcbiAgICAgKiAgICAgIH1cclxuICAgICAqIH1cclxuICAgICAqIGBgYFxyXG4gICAgICogU2luY2UgdGhlIGluc3RhbmNlIG9mIHRoZSBzdXBlcmNsYXNzIGlzIGNyZWF0ZWQgYXV0b21hdGljYWxseSB3aGVuIGFuIG9iamVjdCBpcyBjcmVhdGVkLCBcclxuICAgICAqIHRoZSBTZXJpYWxpemF0aW9uT2ZTdXBlckNsYXNzIG9taXRzIHRoZSB0aGUgbmFtZXNwYWNlTmFtZS5jbGFzc05hbWUga2V5IGFuZCBjb25zaXN0cyBvbmx5IG9mIGl0cyB2YWx1ZS4gXHJcbiAgICAgKiBUaGUgY29uc3RydWN0b3JOYW1lT2ZTdXBlcmNsYXNzIGlzIGdpdmVuIGluc3RlYWQgYXMgYSBwcm9wZXJ0eSBuYW1lIGluIHRoZSBzZXJpYWxpemF0aW9uIG9mIHRoZSBzdWJjbGFzcy5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNlcmlhbGl6ZXIge1xyXG4gICAgICAgIC8qKiBJbiBvcmRlciBmb3IgdGhlIFNlcmlhbGl6ZXIgdG8gY3JlYXRlIGNsYXNzIGluc3RhbmNlcywgaXQgbmVlZHMgYWNjZXNzIHRvIHRoZSBhcHByb3ByaWF0ZSBuYW1lc3BhY2VzICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgbmFtZXNwYWNlczogTmFtZXNwYWNlUmVnaXN0ZXIgPSB7IFwixpJcIjogRnVkZ2VDb3JlIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJlZ2lzdGVycyBhIG5hbWVzcGFjZSB0byB0aGUgW1tTZXJpYWxpemVyXV0sIHRvIGVuYWJsZSBhdXRvbWF0aWMgaW5zdGFudGlhdGlvbiBvZiBjbGFzc2VzIGRlZmluZWQgd2l0aGluXHJcbiAgICAgICAgICogQHBhcmFtIF9uYW1lc3BhY2UgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyByZWdpc3Rlck5hbWVzcGFjZShfbmFtZXNwYWNlOiBPYmplY3QpOiB2b2lkIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBTZXJpYWxpemVyLm5hbWVzcGFjZXMpXHJcbiAgICAgICAgICAgICAgICBpZiAoU2VyaWFsaXplci5uYW1lc3BhY2VzW25hbWVdID09IF9uYW1lc3BhY2UpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5hbWU6IHN0cmluZyA9IFNlcmlhbGl6ZXIuZmluZE5hbWVzcGFjZUluKF9uYW1lc3BhY2UsIHdpbmRvdyk7XHJcbiAgICAgICAgICAgIGlmICghbmFtZSlcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHBhcmVudE5hbWUgaW4gU2VyaWFsaXplci5uYW1lc3BhY2VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IFNlcmlhbGl6ZXIuZmluZE5hbWVzcGFjZUluKF9uYW1lc3BhY2UsIFNlcmlhbGl6ZXIubmFtZXNwYWNlc1twYXJlbnROYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSA9IHBhcmVudE5hbWUgKyBcIi5cIiArIG5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghbmFtZSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5hbWVzcGFjZSBub3QgZm91bmQuIE1heWJlIHBhcmVudCBuYW1lc3BhY2UgaGFzbid0IGJlZW4gcmVnaXN0ZXJlZCBiZWZvcmU/XCIpO1xyXG5cclxuICAgICAgICAgICAgU2VyaWFsaXplci5uYW1lc3BhY2VzW25hbWVdID0gX25hbWVzcGFjZTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm5zIGEgamF2YXNjcmlwdCBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBzZXJpYWxpemFibGUgRlVER0Utb2JqZWN0IGdpdmVuLFxyXG4gICAgICAgICAqIGluY2x1ZGluZyBhdHRhY2hlZCBjb21wb25lbnRzLCBjaGlsZHJlbiwgc3VwZXJjbGFzcy1vYmplY3RzIGFsbCBpbmZvcm1hdGlvbiBuZWVkZWQgZm9yIHJlY29uc3RydWN0aW9uXHJcbiAgICAgICAgICogQHBhcmFtIF9vYmplY3QgQW4gb2JqZWN0IHRvIHNlcmlhbGl6ZSwgaW1wbGVtZW50aW5nIHRoZSBbW1NlcmlhbGl6YWJsZV1dIGludGVyZmFjZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc2VyaWFsaXplKF9vYmplY3Q6IFNlcmlhbGl6YWJsZSk6IFNlcmlhbGl6YXRpb24ge1xyXG4gICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHt9O1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBzYXZlIHRoZSBuYW1lc3BhY2Ugd2l0aCB0aGUgY29uc3RydWN0b3JzIG5hbWVcclxuICAgICAgICAgICAgLy8gc2VyaWFsaXphdGlvbltfb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWVdID0gX29iamVjdC5zZXJpYWxpemUoKTtcclxuICAgICAgICAgICAgbGV0IHBhdGg6IHN0cmluZyA9IHRoaXMuZ2V0RnVsbFBhdGgoX29iamVjdCk7XHJcbiAgICAgICAgICAgIGlmICghcGF0aClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTmFtZXNwYWNlIG9mIHNlcmlhbGl6YWJsZSBvYmplY3Qgb2YgdHlwZSAke19vYmplY3QuY29uc3RydWN0b3IubmFtZX0gbm90IGZvdW5kLiBNYXliZSB0aGUgbmFtZXNwYWNlIGhhc24ndCBiZWVuIHJlZ2lzdGVyZWQgb3IgdGhlIGNsYXNzIG5vdCBleHBvcnRlZD9gKTtcclxuICAgICAgICAgICAgc2VyaWFsaXphdGlvbltwYXRoXSA9IF9vYmplY3Quc2VyaWFsaXplKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xyXG4gICAgICAgICAgICAvLyByZXR1cm4gX29iamVjdC5zZXJpYWxpemUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgYSBGVURHRS1vYmplY3QgcmVjb25zdHJ1Y3RlZCBmcm9tIHRoZSBpbmZvcm1hdGlvbiBpbiB0aGUgW1tTZXJpYWxpemF0aW9uXV0gZ2l2ZW4sXHJcbiAgICAgICAgICogaW5jbHVkaW5nIGF0dGFjaGVkIGNvbXBvbmVudHMsIGNoaWxkcmVuLCBzdXBlcmNsYXNzLW9iamVjdHNcclxuICAgICAgICAgKiBAcGFyYW0gX3NlcmlhbGl6YXRpb24gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XHJcbiAgICAgICAgICAgIGxldCByZWNvbnN0cnVjdDogU2VyaWFsaXphYmxlO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgLy8gbG9vcCBjb25zdHJ1Y3RlZCBzb2xlbHkgdG8gYWNjZXNzIHR5cGUtcHJvcGVydHkuIE9ubHkgb25lIGV4cGVjdGVkIVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgcGF0aCBpbiBfc2VyaWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlY29uc3RydWN0ID0gbmV3ICg8R2VuZXJhbD5GdWRnZSlbdHlwZU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY29uc3RydWN0ID0gU2VyaWFsaXplci5yZWNvbnN0cnVjdChwYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICByZWNvbnN0cnVjdC5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbltwYXRoXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlY29uc3RydWN0O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChfZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRlc2VyaWFsaXphdGlvbiBmYWlsZWQ6IFwiICsgX2Vycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVE9ETzogaW1wbGVtZW50IHByZXR0aWZpZXIgdG8gbWFrZSBKU09OLVN0cmluZ2lmaWNhdGlvbiBvZiBzZXJpYWxpemF0aW9ucyBtb3JlIHJlYWRhYmxlLCBlLmcuIHBsYWNpbmcgeCwgeSBhbmQgeiBpbiBvbmUgbGluZVxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgcHJldHRpZnkoX2pzb246IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBfanNvbjsgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm5zIGEgZm9ybWF0dGVkLCBodW1hbiByZWFkYWJsZSBKU09OLVN0cmluZywgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiBbW1NlcmlhbGl6YWlvbl1dIHRoYXQgbWF5IGhhdmUgYmVlbiBjcmVhdGVkIGJ5IFtbU2VyaWFsaXplcl1dLnNlcmlhbGl6ZVxyXG4gICAgICAgICAqIEBwYXJhbSBfc2VyaWFsaXphdGlvblxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc3RyaW5naWZ5KF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgLy8gYWRqdXN0bWVudHMgdG8gc2VyaWFsaXphdGlvbiBjYW4gYmUgbWFkZSBoZXJlIGJlZm9yZSBzdHJpbmdpZmljYXRpb24sIGlmIGRlc2lyZWRcclxuICAgICAgICAgICAgbGV0IGpzb246IHN0cmluZyA9IEpTT04uc3RyaW5naWZ5KF9zZXJpYWxpemF0aW9uLCBudWxsLCAyKTtcclxuICAgICAgICAgICAgbGV0IHByZXR0eTogc3RyaW5nID0gU2VyaWFsaXplci5wcmV0dGlmeShqc29uKTtcclxuICAgICAgICAgICAgcmV0dXJuIHByZXR0eTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgYSBbW1NlcmlhbGl6YXRpb25dXSBjcmVhdGVkIGZyb20gdGhlIGdpdmVuIEpTT04tU3RyaW5nLiBSZXN1bHQgbWF5IGJlIHBhc3NlZCB0byBbW1NlcmlhbGl6ZXJdXS5kZXNlcmlhbGl6ZVxyXG4gICAgICAgICAqIEBwYXJhbSBfanNvbiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIHBhcnNlKF9qc29uOiBzdHJpbmcpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoX2pzb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDcmVhdGVzIGFuIG9iamVjdCBvZiB0aGUgY2xhc3MgZGVmaW5lZCB3aXRoIHRoZSBmdWxsIHBhdGggaW5jbHVkaW5nIHRoZSBuYW1lc3BhY2VOYW1lKHMpIGFuZCB0aGUgY2xhc3NOYW1lIHNlcGVyYXRlZCBieSBkb3RzKC4pIFxyXG4gICAgICAgICAqIEBwYXJhbSBfcGF0aCBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyByZWNvbnN0cnVjdChfcGF0aDogc3RyaW5nKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgICAgICAgbGV0IHR5cGVOYW1lOiBzdHJpbmcgPSBfcGF0aC5zdWJzdHIoX3BhdGgubGFzdEluZGV4T2YoXCIuXCIpICsgMSk7XHJcbiAgICAgICAgICAgIGxldCBuYW1lc3BhY2U6IE9iamVjdCA9IFNlcmlhbGl6ZXIuZ2V0TmFtZXNwYWNlKF9wYXRoKTtcclxuICAgICAgICAgICAgaWYgKCFuYW1lc3BhY2UpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5hbWVzcGFjZSBvZiBzZXJpYWxpemFibGUgb2JqZWN0IG9mIHR5cGUgJHt0eXBlTmFtZX0gbm90IGZvdW5kLiBNYXliZSB0aGUgbmFtZXNwYWNlIGhhc24ndCBiZWVuIHJlZ2lzdGVyZWQ/YCk7XHJcbiAgICAgICAgICAgIGxldCByZWNvbnN0cnVjdGlvbjogU2VyaWFsaXphYmxlID0gbmV3ICg8R2VuZXJhbD5uYW1lc3BhY2UpW3R5cGVOYW1lXTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlY29uc3RydWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoZSBjbGFzcyBvZiB0aGUgb2JqZWN0LCBpZiBmb3VuZCBpbiB0aGUgcmVnaXN0ZXJlZCBuYW1lc3BhY2VzXHJcbiAgICAgICAgICogQHBhcmFtIF9vYmplY3QgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0RnVsbFBhdGgoX29iamVjdDogU2VyaWFsaXphYmxlKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgbGV0IHR5cGVOYW1lOiBzdHJpbmcgPSBfb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWU7XHJcbiAgICAgICAgICAgIC8vIERlYnVnLmxvZyhcIlNlYXJjaGluZyBuYW1lc3BhY2Ugb2Y6IFwiICsgdHlwZU5hbWUpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuYW1lc3BhY2VOYW1lIGluIFNlcmlhbGl6ZXIubmFtZXNwYWNlcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGZvdW5kOiBHZW5lcmFsID0gKDxHZW5lcmFsPlNlcmlhbGl6ZXIubmFtZXNwYWNlcylbbmFtZXNwYWNlTmFtZV1bdHlwZU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kICYmIF9vYmplY3QgaW5zdGFuY2VvZiBmb3VuZClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmFtZXNwYWNlTmFtZSArIFwiLlwiICsgdHlwZU5hbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm5zIHRoZSBuYW1lc3BhY2Utb2JqZWN0IGRlZmluZWQgd2l0aGluIHRoZSBmdWxsIHBhdGgsIGlmIHJlZ2lzdGVyZWRcclxuICAgICAgICAgKiBAcGFyYW0gX3BhdGhcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBnZXROYW1lc3BhY2UoX3BhdGg6IHN0cmluZyk6IE9iamVjdCB7XHJcbiAgICAgICAgICAgIGxldCBuYW1lc3BhY2VOYW1lOiBzdHJpbmcgPSBfcGF0aC5zdWJzdHIoMCwgX3BhdGgubGFzdEluZGV4T2YoXCIuXCIpKTtcclxuICAgICAgICAgICAgcmV0dXJuIFNlcmlhbGl6ZXIubmFtZXNwYWNlc1tuYW1lc3BhY2VOYW1lXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZpbmRzIHRoZSBuYW1lc3BhY2Utb2JqZWN0IGluIHByb3BlcnRpZXMgb2YgdGhlIHBhcmVudC1vYmplY3QgKGUuZy4gd2luZG93KSwgaWYgcHJlc2VudFxyXG4gICAgICAgICAqIEBwYXJhbSBfbmFtZXNwYWNlIFxyXG4gICAgICAgICAqIEBwYXJhbSBfcGFyZW50IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGZpbmROYW1lc3BhY2VJbihfbmFtZXNwYWNlOiBPYmplY3QsIF9wYXJlbnQ6IE9iamVjdCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHByb3AgaW4gX3BhcmVudClcclxuICAgICAgICAgICAgICAgIGlmICgoPEdlbmVyYWw+X3BhcmVudClbcHJvcF0gPT0gX25hbWVzcGFjZSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvcDtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIE1hcEV2ZW50VHlwZVRvTGlzdGVuZXIge1xyXG4gICAgICAgIFtldmVudFR5cGU6IHN0cmluZ106IEV2ZW50TGlzdGVuZXJbXTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFR5cGVzIG9mIGV2ZW50cyBzcGVjaWZpYyB0byBGdWRnZSwgaW4gYWRkaXRpb24gdG8gdGhlIHN0YW5kYXJkIERPTS9Ccm93c2VyLVR5cGVzIGFuZCBjdXN0b20gc3RyaW5nc1xyXG4gICAgICovXHJcbiAgICBleHBvcnQgY29uc3QgZW51bSBFVkVOVCB7XHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gdGFyZ2V0cyByZWdpc3RlcmVkIGF0IFtbTG9vcF1dLCB3aGVuIHJlcXVlc3RlZCBhbmltYXRpb24gZnJhbWUgc3RhcnRzICovXHJcbiAgICAgICAgTE9PUF9GUkFNRSA9IFwibG9vcEZyYW1lXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBbW0NvbXBvbmVudF1dIHdoZW4gaXRzIGJlaW5nIGFkZGVkIHRvIGEgW1tOb2RlXV0gKi9cclxuICAgICAgICBDT01QT05FTlRfQUREID0gXCJjb21wb25lbnRBZGRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBhIFtbQ29tcG9uZW50XV0gd2hlbiBpdHMgYmVpbmcgcmVtb3ZlZCBmcm9tIGEgW1tOb2RlXV0gKi9cclxuICAgICAgICBDT01QT05FTlRfUkVNT1ZFID0gXCJjb21wb25lbnRSZW1vdmVcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBhIFtbQ29tcG9uZW50XV0gd2hlbiBpdHMgYmVpbmcgYWN0aXZhdGVkICovXHJcbiAgICAgICAgQ09NUE9ORU5UX0FDVElWQVRFID0gXCJjb21wb25lbnRBY3RpdmF0ZVwiLFxyXG4gICAgICAgIC8qKiBkaXNwYXRjaGVkIHRvIGEgW1tDb21wb25lbnRdXSB3aGVuIGl0cyBiZWluZyBkZWFjdGl2YXRlZCAqL1xyXG4gICAgICAgIENPTVBPTkVOVF9ERUFDVElWQVRFID0gXCJjb21wb25lbnREZWFjdGl2YXRlXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBjaGlsZCBbW05vZGVdXSBhbmQgaXRzIGFuY2VzdG9ycyBhZnRlciBpdCB3YXMgYXBwZW5kZWQgdG8gYSBwYXJlbnQgKi9cclxuICAgICAgICBDSElMRF9BUFBFTkQgPSBcImNoaWxkQXBwZW5kXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBjaGlsZCBbW05vZGVdXSBhbmQgaXRzIGFuY2VzdG9ycyBqdXN0IGJlZm9yZSBpdHMgYmVpbmcgcmVtb3ZlZCBmcm9tIGl0cyBwYXJlbnQgKi9cclxuICAgICAgICBDSElMRF9SRU1PVkUgPSBcImNoaWxkUmVtb3ZlXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBbW011dGFibGVdXSB3aGVuIGl0cyBiZWluZyBtdXRhdGVkICovXHJcbiAgICAgICAgTVVUQVRFID0gXCJtdXRhdGVcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW1ZpZXdwb3J0XV0gd2hlbiBpdCBnZXRzIHRoZSBmb2N1cyB0byByZWNlaXZlIGtleWJvYXJkIGlucHV0ICovXHJcbiAgICAgICAgRk9DVVNfSU4gPSBcImZvY3VzaW5cIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW1ZpZXdwb3J0XV0gd2hlbiBpdCBsb3NlcyB0aGUgZm9jdXMgdG8gcmVjZWl2ZSBrZXlib2FyZCBpbnB1dCAqL1xyXG4gICAgICAgIEZPQ1VTX09VVCA9IFwiZm9jdXNvdXRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW05vZGVdXSB3aGVuIGl0J3MgZG9uZSBzZXJpYWxpemluZyAqL1xyXG4gICAgICAgIE5PREVfU0VSSUFMSVpFRCA9IFwibm9kZVNlcmlhbGl6ZWRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW05vZGVdXSB3aGVuIGl0J3MgZG9uZSBkZXNlcmlhbGl6aW5nLCBzbyBhbGwgY29tcG9uZW50cywgY2hpbGRyZW4gYW5kIGF0dHJpYnV0ZXMgYXJlIGF2YWlsYWJsZSAqL1xyXG4gICAgICAgIE5PREVfREVTRVJJQUxJWkVEID0gXCJub2RlRGVzZXJpYWxpemVkXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gW1tOb2RlUmVzb3VyY2VJbnN0YW5jZV1dIHdoZW4gaXQncyBjb250ZW50IGlzIHNldCBhY2NvcmRpbmcgdG8gYSBzZXJpYWxpemF0aW9uIG9mIGEgW1tOb2RlUmVzb3VyY2VdXSAgKi9cclxuICAgICAgICBOT0RFUkVTT1VSQ0VfSU5TVEFOVElBVEVEID0gXCJub2RlUmVzb3VyY2VJbnN0YW50aWF0ZWRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW1RpbWVdXSB3aGVuIGl0J3Mgc2NhbGluZyBjaGFuZ2VkICAqL1xyXG4gICAgICAgIFRJTUVfU0NBTEVEID0gXCJ0aW1lU2NhbGVkXCIsXHJcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gW1tGaWxlSW9dXSB3aGVuIGEgbGlzdCBvZiBmaWxlcyBoYXMgYmVlbiBsb2FkZWQgICovXHJcbiAgICAgICAgRklMRV9MT0FERUQgPSBcImZpbGVMb2FkZWRcIixcclxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW0ZpbGVJb11dIHdoZW4gYSBsaXN0IG9mIGZpbGVzIGhhcyBiZWVuIHNhdmVkICovXHJcbiAgICAgICAgRklMRV9TQVZFRCA9IFwiZmlsZVNhdmVkXCJcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IHR5cGUgRXZlbnTGkiA9IEV2ZW50UG9pbnRlciB8IEV2ZW50RHJhZ0Ryb3AgfCBFdmVudFdoZWVsIHwgRXZlbnRLZXlib2FyZCB8IEV2ZW50O1xyXG5cclxuICAgIGV4cG9ydCB0eXBlIEV2ZW50TGlzdGVuZXLGkiA9XHJcbiAgICAgICAgKChfZXZlbnQ6IEV2ZW50UG9pbnRlcikgPT4gdm9pZCkgfFxyXG4gICAgICAgICgoX2V2ZW50OiBFdmVudERyYWdEcm9wKSA9PiB2b2lkKSB8XHJcbiAgICAgICAgKChfZXZlbnQ6IEV2ZW50V2hlZWwpID0+IHZvaWQpIHxcclxuICAgICAgICAoKF9ldmVudDogRXZlbnRLZXlib2FyZCkgPT4gdm9pZCkgfFxyXG4gICAgICAgICgoX2V2ZW50OiBFdmVudMaSKSA9PiB2b2lkKSB8XHJcbiAgICAgICAgRXZlbnRMaXN0ZW5lck9iamVjdDtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRXZlbnRUYXJnZXTGkiBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcclxuICAgICAgICBhZGRFdmVudExpc3RlbmVyKF90eXBlOiBzdHJpbmcsIF9oYW5kbGVyOiBFdmVudExpc3RlbmVyxpIsIF9vcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFkZEV2ZW50TGlzdGVuZXIoX3R5cGUsIDxFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0Pl9oYW5kbGVyLCBfb3B0aW9ucyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXIoX3R5cGU6IHN0cmluZywgX2hhbmRsZXI6IEV2ZW50TGlzdGVuZXLGkiwgX29wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihfdHlwZSwgPEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3Q+X2hhbmRsZXIsIF9vcHRpb25zKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRpc3BhdGNoRXZlbnQoX2V2ZW50OiBFdmVudMaSKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdXBlci5kaXNwYXRjaEV2ZW50KF9ldmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmFzZSBjbGFzcyBmb3IgRXZlbnRUYXJnZXQgc2luZ2xldG9ucywgd2hpY2ggYXJlIGZpeGVkIGVudGl0aWVzIGluIHRoZSBzdHJ1Y3R1cmUgb2YgRnVkZ2UsIHN1Y2ggYXMgdGhlIGNvcmUgbG9vcCBcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEV2ZW50VGFyZ2V0U3RhdGljIGV4dGVuZHMgRXZlbnRUYXJnZXTGkiB7XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyB0YXJnZXRTdGF0aWM6IEV2ZW50VGFyZ2V0U3RhdGljID0gbmV3IEV2ZW50VGFyZ2V0U3RhdGljKCk7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgYWRkRXZlbnRMaXN0ZW5lcihfdHlwZTogc3RyaW5nLCBfaGFuZGxlcjogRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xyXG4gICAgICAgICAgICBFdmVudFRhcmdldFN0YXRpYy50YXJnZXRTdGF0aWMuYWRkRXZlbnRMaXN0ZW5lcihfdHlwZSwgX2hhbmRsZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgc3RhdGljIHJlbW92ZUV2ZW50TGlzdGVuZXIoX3R5cGU6IHN0cmluZywgX2hhbmRsZXI6IEV2ZW50TGlzdGVuZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgRXZlbnRUYXJnZXRTdGF0aWMudGFyZ2V0U3RhdGljLnJlbW92ZUV2ZW50TGlzdGVuZXIoX3R5cGUsIF9oYW5kbGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBkaXNwYXRjaEV2ZW50KF9ldmVudDogRXZlbnQpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgRXZlbnRUYXJnZXRTdGF0aWMudGFyZ2V0U3RhdGljLmRpc3BhdGNoRXZlbnQoX2V2ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL0V2ZW50L0V2ZW50LnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIC8qKlxyXG4gICAgICogSW50ZXJmYWNlIGRlc2NyaWJpbmcgdGhlIGRhdGF0eXBlcyBvZiB0aGUgYXR0cmlidXRlcyBhIG11dGF0b3IgYXMgc3RyaW5ncyBcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBNdXRhdG9yQXR0cmlidXRlVHlwZXMge1xyXG4gICAgICAgIFthdHRyaWJ1dGU6IHN0cmluZ106IHN0cmluZyB8IE9iamVjdDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogSW50ZXJmYWNlIGRlc2NyaWJpbmcgYSBtdXRhdG9yLCB3aGljaCBpcyBhbiBhc3NvY2lhdGl2ZSBhcnJheSB3aXRoIG5hbWVzIG9mIGF0dHJpYnV0ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgdmFsdWVzXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgTXV0YXRvciB7XHJcbiAgICAgICAgW2F0dHJpYnV0ZTogc3RyaW5nXTogT2JqZWN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBJbnRlcmZhY2VzIGRlZGljYXRlZCBmb3IgZWFjaCBwdXJwb3NlLiBFeHRyYSBhdHRyaWJ1dGUgbmVjZXNzYXJ5IGZvciBjb21waWxldGltZSB0eXBlIGNoZWNraW5nLCBub3QgZXhpc3RlbnQgYXQgcnVudGltZVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIE11dGF0b3JGb3JBbmltYXRpb24gZXh0ZW5kcyBNdXRhdG9yIHsgcmVhZG9ubHkgZm9yQW5pbWF0aW9uOiBudWxsOyB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIE11dGF0b3JGb3JVc2VySW50ZXJmYWNlIGV4dGVuZHMgTXV0YXRvciB7IHJlYWRvbmx5IGZvclVzZXJJbnRlcmZhY2U6IG51bGw7IH1cclxuICAgIC8vIGV4cG9ydCBpbnRlcmZhY2UgTXV0YXRvckZvckNvbXBvbmVudCBleHRlbmRzIE11dGF0b3IgeyByZWFkb25seSBmb3JVc2VyQ29tcG9uZW50OiBudWxsOyB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCYXNlIGNsYXNzIGZvciBhbGwgdHlwZXMgYmVpbmcgbXV0YWJsZSB1c2luZyBbW011dGF0b3JdXS1vYmplY3RzLCB0aHVzIHByb3ZpZGluZyBhbmQgdXNpbmcgaW50ZXJmYWNlcyBjcmVhdGVkIGF0IHJ1bnRpbWUuICBcclxuICAgICAqIE11dGFibGVzIHByb3ZpZGUgYSBbW011dGF0b3JdXSB0aGF0IGlzIGJ1aWxkIGJ5IGNvbGxlY3RpbmcgYWxsIG9iamVjdC1wcm9wZXJ0aWVzIHRoYXQgYXJlIGVpdGhlciBvZiBhIHByaW1pdGl2ZSB0eXBlIG9yIGFnYWluIE11dGFibGUuXHJcbiAgICAgKiBTdWJjbGFzc2VzIGNhbiBlaXRoZXIgcmVkdWNlIHRoZSBzdGFuZGFyZCBbW011dGF0b3JdXSBidWlsdCBieSB0aGlzIGJhc2UgY2xhc3MgYnkgZGVsZXRpbmcgcHJvcGVydGllcyBvciBpbXBsZW1lbnQgYW4gaW5kaXZpZHVhbCBnZXRNdXRhdG9yLW1ldGhvZC5cclxuICAgICAqIFRoZSBwcm92aWRlZCBwcm9wZXJ0aWVzIG9mIHRoZSBbW011dGF0b3JdXSBtdXN0IG1hdGNoIHB1YmxpYyBwcm9wZXJ0aWVzIG9yIGdldHRlcnMvc2V0dGVycyBvZiB0aGUgb2JqZWN0LlxyXG4gICAgICogT3RoZXJ3aXNlLCB0aGV5IHdpbGwgYmUgaWdub3JlZCBpZiBub3QgaGFuZGxlZCBieSBhbiBvdmVycmlkZSBvZiB0aGUgbXV0YXRlLW1ldGhvZCBpbiB0aGUgc3ViY2xhc3MgYW5kIHRocm93IGVycm9ycyBpbiBhbiBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCB1c2VyLWludGVyZmFjZSBmb3IgdGhlIG9iamVjdC5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIE11dGFibGUgZXh0ZW5kcyBFdmVudFRhcmdldMaSIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXRyaWV2ZXMgdGhlIHR5cGUgb2YgdGhpcyBtdXRhYmxlIHN1YmNsYXNzIGFzIHRoZSBuYW1lIG9mIHRoZSBydW50aW1lIGNsYXNzXHJcbiAgICAgICAgICogQHJldHVybnMgVGhlIHR5cGUgb2YgdGhlIG11dGFibGVcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0IHR5cGUoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29sbGVjdCBhcHBsaWNhYmxlIGF0dHJpYnV0ZXMgb2YgdGhlIGluc3RhbmNlIGFuZCBjb3BpZXMgb2YgdGhlaXIgdmFsdWVzIGluIGEgTXV0YXRvci1vYmplY3RcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0TXV0YXRvcigpOiBNdXRhdG9yIHtcclxuICAgICAgICAgICAgbGV0IG11dGF0b3I6IE11dGF0b3IgPSB7fTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNvbGxlY3QgcHJpbWl0aXZlIGFuZCBtdXRhYmxlIGF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgZm9yIChsZXQgYXR0cmlidXRlIGluIHRoaXMpIHtcclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTogT2JqZWN0ID0gdGhpc1thdHRyaWJ1dGVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRnVuY3Rpb24pXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3QgJiYgISh2YWx1ZSBpbnN0YW5jZW9mIE11dGFibGUpKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgbXV0YXRvclthdHRyaWJ1dGVdID0gdGhpc1thdHRyaWJ1dGVdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBtdXRhdG9yIGNhbiBiZSByZWR1Y2VkIGJ1dCBub3QgZXh0ZW5kZWQhXHJcbiAgICAgICAgICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhtdXRhdG9yKTtcclxuICAgICAgICAgICAgLy8gZGVsZXRlIHVud2FudGVkIGF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgdGhpcy5yZWR1Y2VNdXRhdG9yKG11dGF0b3IpO1xyXG5cclxuICAgICAgICAgICAgLy8gcmVwbGFjZSByZWZlcmVuY2VzIHRvIG11dGFibGUgb2JqZWN0cyB3aXRoIHJlZmVyZW5jZXMgdG8gY29waWVzXHJcbiAgICAgICAgICAgIGZvciAobGV0IGF0dHJpYnV0ZSBpbiBtdXRhdG9yKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWU6IE9iamVjdCA9IG11dGF0b3JbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE11dGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgbXV0YXRvclthdHRyaWJ1dGVdID0gdmFsdWUuZ2V0TXV0YXRvcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbXV0YXRvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbGxlY3QgdGhlIGF0dHJpYnV0ZXMgb2YgdGhlIGluc3RhbmNlIGFuZCB0aGVpciB2YWx1ZXMgYXBwbGljYWJsZSBmb3IgYW5pbWF0aW9uLlxyXG4gICAgICAgICAqIEJhc2ljIGZ1bmN0aW9uYWxpdHkgaXMgaWRlbnRpY2FsIHRvIFtbZ2V0TXV0YXRvcl1dLCByZXR1cm5lZCBtdXRhdG9yIHNob3VsZCB0aGVuIGJlIHJlZHVjZWQgYnkgdGhlIHN1YmNsYXNzZWQgaW5zdGFuY2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0TXV0YXRvckZvckFuaW1hdGlvbigpOiBNdXRhdG9yRm9yQW5pbWF0aW9uIHtcclxuICAgICAgICAgICAgcmV0dXJuIDxNdXRhdG9yRm9yQW5pbWF0aW9uPnRoaXMuZ2V0TXV0YXRvcigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb2xsZWN0IHRoZSBhdHRyaWJ1dGVzIG9mIHRoZSBpbnN0YW5jZSBhbmQgdGhlaXIgdmFsdWVzIGFwcGxpY2FibGUgZm9yIHRoZSB1c2VyIGludGVyZmFjZS5cclxuICAgICAgICAgKiBCYXNpYyBmdW5jdGlvbmFsaXR5IGlzIGlkZW50aWNhbCB0byBbW2dldE11dGF0b3JdXSwgcmV0dXJuZWQgbXV0YXRvciBzaG91bGQgdGhlbiBiZSByZWR1Y2VkIGJ5IHRoZSBzdWJjbGFzc2VkIGluc3RhbmNlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldE11dGF0b3JGb3JVc2VySW50ZXJmYWNlKCk6IE11dGF0b3JGb3JVc2VySW50ZXJmYWNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIDxNdXRhdG9yRm9yVXNlckludGVyZmFjZT50aGlzLmdldE11dGF0b3IoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29sbGVjdCB0aGUgYXR0cmlidXRlcyBvZiB0aGUgaW5zdGFuY2UgYW5kIHRoZWlyIHZhbHVlcyBhcHBsaWNhYmxlIGZvciBpbmRpdml1YWxpemF0aW9uIGJ5IHRoZSBjb21wb25lbnQuXHJcbiAgICAgICAgICogQmFzaWMgZnVuY3Rpb25hbGl0eSBpcyBpZGVudGljYWwgdG8gW1tnZXRNdXRhdG9yXV0sIHJldHVybmVkIG11dGF0b3Igc2hvdWxkIHRoZW4gYmUgcmVkdWNlZCBieSB0aGUgc3ViY2xhc3NlZCBpbnN0YW5jZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIC8vIHB1YmxpYyBnZXRNdXRhdG9yRm9yQ29tcG9uZW50KCk6IE11dGF0b3JGb3JDb21wb25lbnQge1xyXG4gICAgICAgIC8vICAgICByZXR1cm4gPE11dGF0b3JGb3JDb21wb25lbnQ+dGhpcy5nZXRNdXRhdG9yKCk7XHJcbiAgICAgICAgLy8gfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgYW4gYXNzb2NpYXRpdmUgYXJyYXkgd2l0aCB0aGUgc2FtZSBhdHRyaWJ1dGVzIGFzIHRoZSBnaXZlbiBtdXRhdG9yLCBidXQgd2l0aCB0aGUgY29ycmVzcG9uZGluZyB0eXBlcyBhcyBzdHJpbmctdmFsdWVzXHJcbiAgICAgICAgICogRG9lcyBub3QgcmVjdXJzZSBpbnRvIG9iamVjdHMhXHJcbiAgICAgICAgICogQHBhcmFtIF9tdXRhdG9yIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBnZXRNdXRhdG9yQXR0cmlidXRlVHlwZXMoX211dGF0b3I6IE11dGF0b3IpOiBNdXRhdG9yQXR0cmlidXRlVHlwZXMge1xyXG4gICAgICAgICAgICBsZXQgdHlwZXM6IE11dGF0b3JBdHRyaWJ1dGVUeXBlcyA9IHt9O1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gX211dGF0b3IpIHtcclxuICAgICAgICAgICAgICAgIGxldCB0eXBlOiBzdHJpbmcgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlOiBudW1iZXIgfCBib29sZWFuIHwgc3RyaW5nIHwgb2JqZWN0ID0gX211dGF0b3JbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgICAgIGlmIChfbXV0YXRvclthdHRyaWJ1dGVdICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mICh2YWx1ZSkgPT0gXCJvYmplY3RcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICg8R2VuZXJhbD50aGlzKVthdHRyaWJ1dGVdLmNvbnN0cnVjdG9yLm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gX211dGF0b3JbYXR0cmlidXRlXS5jb25zdHJ1Y3Rvci5uYW1lO1xyXG4gICAgICAgICAgICAgICAgdHlwZXNbYXR0cmlidXRlXSA9IHR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBVcGRhdGVzIHRoZSB2YWx1ZXMgb2YgdGhlIGdpdmVuIG11dGF0b3IgYWNjb3JkaW5nIHRvIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBpbnN0YW5jZVxyXG4gICAgICAgICAqIEBwYXJhbSBfbXV0YXRvciBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgdXBkYXRlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gX211dGF0b3IpIHtcclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTogT2JqZWN0ID0gX211dGF0b3JbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE11dGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5nZXRNdXRhdG9yKCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgX211dGF0b3JbYXR0cmlidXRlXSA9ICg8R2VuZXJhbD50aGlzKVthdHRyaWJ1dGVdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFVwZGF0ZXMgdGhlIGF0dHJpYnV0ZSB2YWx1ZXMgb2YgdGhlIGluc3RhbmNlIGFjY29yZGluZyB0byB0aGUgc3RhdGUgb2YgdGhlIG11dGF0b3IuIE11c3QgYmUgcHJvdGVjdGVkLi4uIVxyXG4gICAgICAgICAqIEBwYXJhbSBfbXV0YXRvclxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBtdXRhdGUoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogZG9uJ3QgYXNzaWduIHVua25vd24gcHJvcGVydGllc1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gX211dGF0b3IpIHtcclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTogTXV0YXRvciA9IDxNdXRhdG9yPl9tdXRhdG9yW2F0dHJpYnV0ZV07XHJcbiAgICAgICAgICAgICAgICBsZXQgbXV0YW50OiBPYmplY3QgPSAoPEdlbmVyYWw+dGhpcylbYXR0cmlidXRlXTtcclxuICAgICAgICAgICAgICAgIGlmIChtdXRhbnQgaW5zdGFuY2VvZiBNdXRhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgIG11dGFudC5tdXRhdGUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICg8R2VuZXJhbD50aGlzKVthdHRyaWJ1dGVdID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChFVkVOVC5NVVRBVEUpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVkdWNlcyB0aGUgYXR0cmlidXRlcyBvZiB0aGUgZ2VuZXJhbCBtdXRhdG9yIGFjY29yZGluZyB0byBkZXNpcmVkIG9wdGlvbnMgZm9yIG11dGF0aW9uLiBUbyBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc2VzXHJcbiAgICAgICAgICogQHBhcmFtIF9tdXRhdG9yIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByb3RlY3RlZCBhYnN0cmFjdCByZWR1Y2VNdXRhdG9yKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZDtcclxuICAgIH1cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvU2VyaWFsaXplci50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL011dGFibGUudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAvKipcclxuICAgKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgQW5pbWF0aW9uU3RydWN0dXJlIHRoYXQgdGhlIEFuaW1hdGlvbiB1c2VzIHRvIG1hcCB0aGUgU2VxdWVuY2VzIHRvIHRoZSBBdHRyaWJ1dGVzLlxyXG4gICAqIEJ1aWx0IG91dCBvZiBhIFtbTm9kZV1dJ3Mgc2VyaWFsc2F0aW9uLCBpdCBzd2FwcyB0aGUgdmFsdWVzIHdpdGggW1tBbmltYXRpb25TZXF1ZW5jZV1dcy5cclxuICAgKi9cclxuICBleHBvcnQgaW50ZXJmYWNlIEFuaW1hdGlvblN0cnVjdHVyZSB7XHJcbiAgICBbYXR0cmlidXRlOiBzdHJpbmddOiBTZXJpYWxpemF0aW9uIHwgQW5pbWF0aW9uU2VxdWVuY2U7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAqIEFuIGFzc29jaWF0aXZlIGFycmF5IG1hcHBpbmcgbmFtZXMgb2YgbGFibGVzIHRvIHRpbWVzdGFtcHMuXHJcbiAgKiBMYWJlbHMgbmVlZCB0byBiZSB1bmlxdWUgcGVyIEFuaW1hdGlvbi5cclxuICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcclxuICAqL1xyXG4gIGV4cG9ydCBpbnRlcmZhY2UgQW5pbWF0aW9uTGFiZWwge1xyXG4gICAgW25hbWU6IHN0cmluZ106IG51bWJlcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICogSG9sZHMgaW5mb3JtYXRpb24gYWJvdXQgQW5pbWF0aW9uIEV2ZW50IFRyaWdnZXJzXHJcbiAgKiBAYXV0aG9yIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XHJcbiAgKi9cclxuICBleHBvcnQgaW50ZXJmYWNlIEFuaW1hdGlvbkV2ZW50VHJpZ2dlciB7XHJcbiAgICBbbmFtZTogc3RyaW5nXTogbnVtYmVyO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW50ZXJuYWxseSB1c2VkIHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiB0aGUgdmFyaW91cyBnZW5lcmF0ZWQgc3RydWN0dXJlcyBhbmQgZXZlbnRzLlxyXG4gICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcclxuICAgKi9cclxuICBlbnVtIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSB7XHJcbiAgICAvKipEZWZhdWx0OiBmb3J3YXJkLCBjb250aW5vdXMgKi9cclxuICAgIE5PUk1BTCxcclxuICAgIC8qKmJhY2t3YXJkLCBjb250aW5vdXMgKi9cclxuICAgIFJFVkVSU0UsXHJcbiAgICAvKipmb3J3YXJkLCByYXN0ZXJlZCAqL1xyXG4gICAgUkFTVEVSRUQsXHJcbiAgICAvKipiYWNrd2FyZCwgcmFzdGVyZWQgKi9cclxuICAgIFJBU1RFUkVEUkVWRVJTRVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQW5pbWF0aW9uIENsYXNzIHRvIGhvbGQgYWxsIHJlcXVpcmVkIE9iamVjdHMgdGhhdCBhcmUgcGFydCBvZiBhbiBBbmltYXRpb24uXHJcbiAgICogQWxzbyBob2xkcyBmdW5jdGlvbnMgdG8gcGxheSBzYWlkIEFuaW1hdGlvbi5cclxuICAgKiBDYW4gYmUgYWRkZWQgdG8gYSBOb2RlIGFuZCBwbGF5ZWQgdGhyb3VnaCBbW0NvbXBvbmVudEFuaW1hdG9yXV0uXHJcbiAgICogQGF1dGhvciBMdWthcyBTY2hldWVybGUsIEhGVSwgMjAxOVxyXG4gICAqL1xyXG4gIGV4cG9ydCBjbGFzcyBBbmltYXRpb24gZXh0ZW5kcyBNdXRhYmxlIGltcGxlbWVudHMgU2VyaWFsaXphYmxlUmVzb3VyY2Uge1xyXG4gICAgaWRSZXNvdXJjZTogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgdG90YWxUaW1lOiBudW1iZXIgPSAwO1xyXG4gICAgbGFiZWxzOiBBbmltYXRpb25MYWJlbCA9IHt9O1xyXG4gICAgc3RlcHNQZXJTZWNvbmQ6IG51bWJlciA9IDEwO1xyXG4gICAgYW5pbWF0aW9uU3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmU7XHJcbiAgICBldmVudHM6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHt9O1xyXG4gICAgcHJpdmF0ZSBmcmFtZXNQZXJTZWNvbmQ6IG51bWJlciA9IDYwO1xyXG5cclxuICAgIC8vIHByb2Nlc3NlZCBldmVudGxpc3QgYW5kIGFuaW1hdGlvbiBzdHJ1Y3V0cmVzIGZvciBwbGF5YmFjay5cclxuICAgIHByaXZhdGUgZXZlbnRzUHJvY2Vzc2VkOiBNYXA8QU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLCBBbmltYXRpb25FdmVudFRyaWdnZXI+ID0gbmV3IE1hcDxBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUsIEFuaW1hdGlvbkV2ZW50VHJpZ2dlcj4oKTtcclxuICAgIHByaXZhdGUgYW5pbWF0aW9uU3RydWN0dXJlc1Byb2Nlc3NlZDogTWFwPEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSwgQW5pbWF0aW9uU3RydWN0dXJlPiA9IG5ldyBNYXA8QU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLCBBbmltYXRpb25TdHJ1Y3R1cmU+KCk7XHJcblxyXG4gICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2FuaW1TdHJ1Y3R1cmU6IEFuaW1hdGlvblN0cnVjdHVyZSA9IHt9LCBfZnBzOiBudW1iZXIgPSA2MCkge1xyXG4gICAgICBzdXBlcigpO1xyXG4gICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcclxuICAgICAgdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmUgPSBfYW5pbVN0cnVjdHVyZTtcclxuICAgICAgdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmVzUHJvY2Vzc2VkLnNldChBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuTk9STUFMLCBfYW5pbVN0cnVjdHVyZSk7XHJcbiAgICAgIHRoaXMuZnJhbWVzUGVyU2Vjb25kID0gX2ZwcztcclxuICAgICAgdGhpcy5jYWxjdWxhdGVUb3RhbFRpbWUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdlbmVyYXRlcyBhIG5ldyBcIk11dGF0b3JcIiB3aXRoIHRoZSBpbmZvcm1hdGlvbiB0byBhcHBseSB0byB0aGUgW1tOb2RlXV0gdGhlIFtbQ29tcG9uZW50QW5pbWF0b3JdXSBpcyBhdHRhY2hlZCB0byB3aXRoIFtbTm9kZS5hcHBseUFuaW1hdGlvbigpXV0uXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgVGhlIHRpbWUgYXQgd2hpY2ggdGhlIGFuaW1hdGlvbiBjdXJyZW50bHkgaXMgYXRcclxuICAgICAqIEBwYXJhbSBfZGlyZWN0aW9uIFRoZSBkaXJlY3Rpb24gaW4gd2hpY2ggdGhlIGFuaW1hdGlvbiBpcyBzdXBwb3NlZCB0byBiZSBwbGF5aW5nIGJhY2suID4wID09IGZvcndhcmQsIDAgPT0gc3RvcCwgPDAgPT0gYmFja3dhcmRzXHJcbiAgICAgKiBAcGFyYW0gX3BsYXliYWNrIFRoZSBwbGF5YmFja21vZGUgdGhlIGFuaW1hdGlvbiBpcyBzdXBwb3NlZCB0byBiZSBjYWxjdWxhdGVkIHdpdGguXHJcbiAgICAgKiBAcmV0dXJucyBhIFwiTXV0YXRvclwiIHRvIGFwcGx5LlxyXG4gICAgICovXHJcbiAgICBnZXRNdXRhdGVkKF90aW1lOiBudW1iZXIsIF9kaXJlY3Rpb246IG51bWJlciwgX3BsYXliYWNrOiBBTklNQVRJT05fUExBWUJBQ0spOiBNdXRhdG9yIHsgICAgIC8vVE9ETzogZmluZCBhIGJldHRlciBuYW1lIGZvciB0aGlzXHJcbiAgICAgIGxldCBtOiBNdXRhdG9yID0ge307XHJcbiAgICAgIGlmIChfcGxheWJhY2sgPT0gQU5JTUFUSU9OX1BMQVlCQUNLLlRJTUVCQVNFRF9DT05USU5PVVMpIHtcclxuICAgICAgICBpZiAoX2RpcmVjdGlvbiA+PSAwKSB7XHJcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLk5PUk1BTCksIF90aW1lKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbSA9IHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JNdXRhdG9yKHRoaXMuZ2V0UHJvY2Vzc2VkQW5pbWF0aW9uU3RydWN0dXJlKEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SRVZFUlNFKSwgX3RpbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoX2RpcmVjdGlvbiA+PSAwKSB7XHJcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEKSwgX3RpbWUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEUkVWRVJTRSksIF90aW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBtO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJucyBhIGxpc3Qgb2YgdGhlIG5hbWVzIG9mIHRoZSBldmVudHMgdGhlIFtbQ29tcG9uZW50QW5pbWF0b3JdXSBuZWVkcyB0byBmaXJlIGJldHdlZW4gX21pbiBhbmQgX21heC4gXHJcbiAgICAgKiBAcGFyYW0gX21pbiBUaGUgbWluaW11bSB0aW1lIChpbmNsdXNpdmUpIHRvIGNoZWNrIGJldHdlZW5cclxuICAgICAqIEBwYXJhbSBfbWF4IFRoZSBtYXhpbXVtIHRpbWUgKGV4Y2x1c2l2ZSkgdG8gY2hlY2sgYmV0d2VlblxyXG4gICAgICogQHBhcmFtIF9wbGF5YmFjayBUaGUgcGxheWJhY2sgbW9kZSB0byBjaGVjayBpbi4gSGFzIGFuIGVmZmVjdCBvbiB3aGVuIHRoZSBFdmVudHMgYXJlIGZpcmVkLiBcclxuICAgICAqIEBwYXJhbSBfZGlyZWN0aW9uIFRoZSBkaXJlY3Rpb24gdGhlIGFuaW1hdGlvbiBpcyBzdXBwb3NlZCB0byBydW4gaW4uID4wID09IGZvcndhcmQsIDAgPT0gc3RvcCwgPDAgPT0gYmFja3dhcmRzXHJcbiAgICAgKiBAcmV0dXJucyBhIGxpc3Qgb2Ygc3RyaW5ncyB3aXRoIHRoZSBuYW1lcyBvZiB0aGUgY3VzdG9tIGV2ZW50cyB0byBmaXJlLlxyXG4gICAgICovXHJcbiAgICBnZXRFdmVudHNUb0ZpcmUoX21pbjogbnVtYmVyLCBfbWF4OiBudW1iZXIsIF9wbGF5YmFjazogQU5JTUFUSU9OX1BMQVlCQUNLLCBfZGlyZWN0aW9uOiBudW1iZXIpOiBzdHJpbmdbXSB7XHJcbiAgICAgIGxldCBldmVudExpc3Q6IHN0cmluZ1tdID0gW107XHJcbiAgICAgIGxldCBtaW5TZWN0aW9uOiBudW1iZXIgPSBNYXRoLmZsb29yKF9taW4gLyB0aGlzLnRvdGFsVGltZSk7XHJcbiAgICAgIGxldCBtYXhTZWN0aW9uOiBudW1iZXIgPSBNYXRoLmZsb29yKF9tYXggLyB0aGlzLnRvdGFsVGltZSk7XHJcbiAgICAgIF9taW4gPSBfbWluICUgdGhpcy50b3RhbFRpbWU7XHJcbiAgICAgIF9tYXggPSBfbWF4ICUgdGhpcy50b3RhbFRpbWU7XHJcblxyXG4gICAgICB3aGlsZSAobWluU2VjdGlvbiA8PSBtYXhTZWN0aW9uKSB7XHJcbiAgICAgICAgbGV0IGV2ZW50VHJpZ2dlcnM6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHRoaXMuZ2V0Q29ycmVjdEV2ZW50TGlzdChfZGlyZWN0aW9uLCBfcGxheWJhY2spO1xyXG4gICAgICAgIGlmIChtaW5TZWN0aW9uID09IG1heFNlY3Rpb24pIHtcclxuICAgICAgICAgIGV2ZW50TGlzdCA9IGV2ZW50TGlzdC5jb25jYXQodGhpcy5jaGVja0V2ZW50c0JldHdlZW4oZXZlbnRUcmlnZ2VycywgX21pbiwgX21heCkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBldmVudExpc3QgPSBldmVudExpc3QuY29uY2F0KHRoaXMuY2hlY2tFdmVudHNCZXR3ZWVuKGV2ZW50VHJpZ2dlcnMsIF9taW4sIHRoaXMudG90YWxUaW1lKSk7XHJcbiAgICAgICAgICBfbWluID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgbWluU2VjdGlvbisrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gZXZlbnRMaXN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRkcyBhbiBFdmVudCB0byB0aGUgTGlzdCBvZiBldmVudHMuXHJcbiAgICAgKiBAcGFyYW0gX25hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50IChuZWVkcyB0byBiZSB1bmlxdWUgcGVyIEFuaW1hdGlvbikuXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgVGhlIHRpbWVzdGFtcCBvZiB0aGUgZXZlbnQgKGluIG1pbGxpc2Vjb25kcykuXHJcbiAgICAgKi9cclxuICAgIHNldEV2ZW50KF9uYW1lOiBzdHJpbmcsIF90aW1lOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgdGhpcy5ldmVudHNbX25hbWVdID0gX3RpbWU7XHJcbiAgICAgIHRoaXMuZXZlbnRzUHJvY2Vzc2VkLmNsZWFyKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyB0aGUgZXZlbnQgd2l0aCB0aGUgZ2l2ZW4gbmFtZSBmcm9tIHRoZSBsaXN0IG9mIGV2ZW50cy5cclxuICAgICAqIEBwYXJhbSBfbmFtZSBuYW1lIG9mIHRoZSBldmVudCB0byByZW1vdmUuXHJcbiAgICAgKi9cclxuICAgIHJlbW92ZUV2ZW50KF9uYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgZGVsZXRlIHRoaXMuZXZlbnRzW19uYW1lXTtcclxuICAgICAgdGhpcy5ldmVudHNQcm9jZXNzZWQuY2xlYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgZ2V0TGFiZWxzKCk6IEVudW1lcmF0b3Ige1xyXG4gICAgICAvL1RPRE86IHRoaXMgYWN0dWFsbHkgbmVlZHMgdGVzdGluZ1xyXG4gICAgICBsZXQgZW46IEVudW1lcmF0b3IgPSBuZXcgRW51bWVyYXRvcih0aGlzLmxhYmVscyk7XHJcbiAgICAgIHJldHVybiBlbjtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgZnBzKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLmZyYW1lc1BlclNlY29uZDtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgZnBzKF9mcHM6IG51bWJlcikge1xyXG4gICAgICB0aGlzLmZyYW1lc1BlclNlY29uZCA9IF9mcHM7XHJcbiAgICAgIHRoaXMuZXZlbnRzUHJvY2Vzc2VkLmNsZWFyKCk7XHJcbiAgICAgIHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlc1Byb2Nlc3NlZC5jbGVhcigpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogKFJlLSlDYWxjdWxhdGUgdGhlIHRvdGFsIHRpbWUgb2YgdGhlIEFuaW1hdGlvbi4gQ2FsY3VsYXRpb24taGVhdnksIHVzZSBvbmx5IGlmIGFjdHVhbGx5IG5lZWRlZC5cclxuICAgICAqL1xyXG4gICAgY2FsY3VsYXRlVG90YWxUaW1lKCk6IHZvaWQge1xyXG4gICAgICB0aGlzLnRvdGFsVGltZSA9IDA7XHJcbiAgICAgIHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JUaW1lKHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gdHJhbnNmZXJcclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IHM6IFNlcmlhbGl6YXRpb24gPSB7XHJcbiAgICAgICAgaWRSZXNvdXJjZTogdGhpcy5pZFJlc291cmNlLFxyXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcclxuICAgICAgICBsYWJlbHM6IHt9LFxyXG4gICAgICAgIGV2ZW50czoge30sXHJcbiAgICAgICAgZnBzOiB0aGlzLmZyYW1lc1BlclNlY29uZCxcclxuICAgICAgICBzcHM6IHRoaXMuc3RlcHNQZXJTZWNvbmRcclxuICAgICAgfTtcclxuICAgICAgZm9yIChsZXQgbmFtZSBpbiB0aGlzLmxhYmVscykge1xyXG4gICAgICAgIHMubGFiZWxzW25hbWVdID0gdGhpcy5sYWJlbHNbbmFtZV07XHJcbiAgICAgIH1cclxuICAgICAgZm9yIChsZXQgbmFtZSBpbiB0aGlzLmV2ZW50cykge1xyXG4gICAgICAgIHMuZXZlbnRzW25hbWVdID0gdGhpcy5ldmVudHNbbmFtZV07XHJcbiAgICAgIH1cclxuICAgICAgcy5hbmltYXRpb25TdHJ1Y3R1cmUgPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yU2VyaWFsaXNhdGlvbih0aGlzLmFuaW1hdGlvblN0cnVjdHVyZSk7XHJcbiAgICAgIHJldHVybiBzO1xyXG4gICAgfVxyXG4gICAgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICB0aGlzLmlkUmVzb3VyY2UgPSBfc2VyaWFsaXphdGlvbi5pZFJlc291cmNlO1xyXG4gICAgICB0aGlzLm5hbWUgPSBfc2VyaWFsaXphdGlvbi5uYW1lO1xyXG4gICAgICB0aGlzLmZyYW1lc1BlclNlY29uZCA9IF9zZXJpYWxpemF0aW9uLmZwcztcclxuICAgICAgdGhpcy5zdGVwc1BlclNlY29uZCA9IF9zZXJpYWxpemF0aW9uLnNwcztcclxuICAgICAgdGhpcy5sYWJlbHMgPSB7fTtcclxuICAgICAgZm9yIChsZXQgbmFtZSBpbiBfc2VyaWFsaXphdGlvbi5sYWJlbHMpIHtcclxuICAgICAgICB0aGlzLmxhYmVsc1tuYW1lXSA9IF9zZXJpYWxpemF0aW9uLmxhYmVsc1tuYW1lXTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmV2ZW50cyA9IHt9O1xyXG4gICAgICBmb3IgKGxldCBuYW1lIGluIF9zZXJpYWxpemF0aW9uLmV2ZW50cykge1xyXG4gICAgICAgIHRoaXMuZXZlbnRzW25hbWVdID0gX3NlcmlhbGl6YXRpb24uZXZlbnRzW25hbWVdO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuZXZlbnRzUHJvY2Vzc2VkID0gbmV3IE1hcDxBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUsIEFuaW1hdGlvbkV2ZW50VHJpZ2dlcj4oKTtcclxuXHJcbiAgICAgIHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvckRlc2VyaWFsaXNhdGlvbihfc2VyaWFsaXphdGlvbi5hbmltYXRpb25TdHJ1Y3R1cmUpO1xyXG5cclxuICAgICAgdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmVzUHJvY2Vzc2VkID0gbmV3IE1hcDxBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUsIEFuaW1hdGlvblN0cnVjdHVyZT4oKTtcclxuXHJcbiAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgcHVibGljIGdldE11dGF0b3IoKTogTXV0YXRvciB7XHJcbiAgICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZSgpO1xyXG4gICAgfVxyXG4gICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgZGVsZXRlIF9tdXRhdG9yLnRvdGFsVGltZTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogVHJhdmVyc2VzIGFuIEFuaW1hdGlvblN0cnVjdHVyZSBhbmQgcmV0dXJucyB0aGUgU2VyaWFsaXphdGlvbiBvZiBzYWlkIFN0cnVjdHVyZS5cclxuICAgICAqIEBwYXJhbSBfc3RydWN0dXJlIFRoZSBBbmltYXRpb24gU3RydWN0dXJlIGF0IHRoZSBjdXJyZW50IGxldmVsIHRvIHRyYW5zZm9ybSBpbnRvIHRoZSBTZXJpYWxpemF0aW9uLlxyXG4gICAgICogQHJldHVybnMgdGhlIGZpbGxlZCBTZXJpYWxpemF0aW9uLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyYXZlcnNlU3RydWN0dXJlRm9yU2VyaWFsaXNhdGlvbihfc3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IG5ld1NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB7fTtcclxuICAgICAgZm9yIChsZXQgbiBpbiBfc3RydWN0dXJlKSB7XHJcbiAgICAgICAgaWYgKF9zdHJ1Y3R1cmVbbl0gaW5zdGFuY2VvZiBBbmltYXRpb25TZXF1ZW5jZSkge1xyXG4gICAgICAgICAgbmV3U2VyaWFsaXphdGlvbltuXSA9IF9zdHJ1Y3R1cmVbbl0uc2VyaWFsaXplKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb25bbl0gPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yU2VyaWFsaXNhdGlvbig8QW5pbWF0aW9uU3RydWN0dXJlPl9zdHJ1Y3R1cmVbbl0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbmV3U2VyaWFsaXphdGlvbjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogVHJhdmVyc2VzIGEgU2VyaWFsaXphdGlvbiB0byBjcmVhdGUgYSBuZXcgQW5pbWF0aW9uU3RydWN0dXJlLlxyXG4gICAgICogQHBhcmFtIF9zZXJpYWxpemF0aW9uIFRoZSBzZXJpYWxpemF0aW9uIHRvIHRyYW5zZmVyIGludG8gYW4gQW5pbWF0aW9uU3RydWN0dXJlXHJcbiAgICAgKiBAcmV0dXJucyB0aGUgbmV3bHkgY3JlYXRlZCBBbmltYXRpb25TdHJ1Y3R1cmUuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdHJhdmVyc2VTdHJ1Y3R1cmVGb3JEZXNlcmlhbGlzYXRpb24oX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBBbmltYXRpb25TdHJ1Y3R1cmUge1xyXG4gICAgICBsZXQgbmV3U3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUgPSB7fTtcclxuICAgICAgZm9yIChsZXQgbiBpbiBfc2VyaWFsaXphdGlvbikge1xyXG4gICAgICAgIGlmIChfc2VyaWFsaXphdGlvbltuXS5hbmltYXRpb25TZXF1ZW5jZSkge1xyXG4gICAgICAgICAgbGV0IGFuaW1TZXE6IEFuaW1hdGlvblNlcXVlbmNlID0gbmV3IEFuaW1hdGlvblNlcXVlbmNlKCk7XHJcbiAgICAgICAgICBuZXdTdHJ1Y3R1cmVbbl0gPSBhbmltU2VxLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uW25dKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbmV3U3RydWN0dXJlW25dID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvckRlc2VyaWFsaXNhdGlvbihfc2VyaWFsaXphdGlvbltuXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBuZXdTdHJ1Y3R1cmU7XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpbmRzIHRoZSBsaXN0IG9mIGV2ZW50cyB0byBiZSB1c2VkIHdpdGggdGhlc2Ugc2V0dGluZ3MuXHJcbiAgICAgKiBAcGFyYW0gX2RpcmVjdGlvbiBUaGUgZGlyZWN0aW9uIHRoZSBhbmltYXRpb24gaXMgcGxheWluZyBpbi5cclxuICAgICAqIEBwYXJhbSBfcGxheWJhY2sgVGhlIHBsYXliYWNrbW9kZSB0aGUgYW5pbWF0aW9uIGlzIHBsYXlpbmcgaW4uXHJcbiAgICAgKiBAcmV0dXJucyBUaGUgY29ycmVjdCBBbmltYXRpb25FdmVudFRyaWdnZXIgT2JqZWN0IHRvIHVzZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldENvcnJlY3RFdmVudExpc3QoX2RpcmVjdGlvbjogbnVtYmVyLCBfcGxheWJhY2s6IEFOSU1BVElPTl9QTEFZQkFDSyk6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciB7XHJcbiAgICAgIGlmIChfcGxheWJhY2sgIT0gQU5JTUFUSU9OX1BMQVlCQUNLLkZSQU1FQkFTRUQpIHtcclxuICAgICAgICBpZiAoX2RpcmVjdGlvbiA+PSAwKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQcm9jZXNzZWRFdmVudFRyaWdnZXIoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLk5PUk1BTCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmdldFByb2Nlc3NlZEV2ZW50VHJpZ2dlcihBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChfZGlyZWN0aW9uID49IDApIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmdldFByb2Nlc3NlZEV2ZW50VHJpZ2dlcihBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRUQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQcm9jZXNzZWRFdmVudFRyaWdnZXIoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEUkVWRVJTRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUcmF2ZXJzZXMgYW4gQW5pbWF0aW9uU3RydWN0dXJlIHRvIHR1cm4gaXQgaW50byB0aGUgXCJNdXRhdG9yXCIgdG8gcmV0dXJuIHRvIHRoZSBDb21wb25lbnQuXHJcbiAgICAgKiBAcGFyYW0gX3N0cnVjdHVyZSBUaGUgc3RyY3V0dXJlIHRvIHRyYXZlcnNlXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgdGhlIHBvaW50IGluIHRpbWUgdG8gd3JpdGUgdGhlIGFuaW1hdGlvbiBudW1iZXJzIGludG8uXHJcbiAgICAgKiBAcmV0dXJucyBUaGUgXCJNdXRhdG9yXCIgZmlsbGVkIHdpdGggdGhlIGNvcnJlY3QgdmFsdWVzIGF0IHRoZSBnaXZlbiB0aW1lLiBcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB0cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IoX3N0cnVjdHVyZTogQW5pbWF0aW9uU3RydWN0dXJlLCBfdGltZTogbnVtYmVyKTogTXV0YXRvciB7XHJcbiAgICAgIGxldCBuZXdNdXRhdG9yOiBNdXRhdG9yID0ge307XHJcbiAgICAgIGZvciAobGV0IG4gaW4gX3N0cnVjdHVyZSkge1xyXG4gICAgICAgIGlmIChfc3RydWN0dXJlW25dIGluc3RhbmNlb2YgQW5pbWF0aW9uU2VxdWVuY2UpIHtcclxuICAgICAgICAgIG5ld011dGF0b3Jbbl0gPSAoPEFuaW1hdGlvblNlcXVlbmNlPl9zdHJ1Y3R1cmVbbl0pLmV2YWx1YXRlKF90aW1lKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbmV3TXV0YXRvcltuXSA9IHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JNdXRhdG9yKDxBbmltYXRpb25TdHJ1Y3R1cmU+X3N0cnVjdHVyZVtuXSwgX3RpbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbmV3TXV0YXRvcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyYXZlcnNlcyB0aGUgY3VycmVudCBBbmltYXRpb25TdHJjdXR1cmUgdG8gZmluZCB0aGUgdG90YWxUaW1lIG9mIHRoaXMgYW5pbWF0aW9uLlxyXG4gICAgICogQHBhcmFtIF9zdHJ1Y3R1cmUgVGhlIHN0cnVjdHVyZSB0byB0cmF2ZXJzZVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyYXZlcnNlU3RydWN0dXJlRm9yVGltZShfc3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUpOiB2b2lkIHtcclxuICAgICAgZm9yIChsZXQgbiBpbiBfc3RydWN0dXJlKSB7XHJcbiAgICAgICAgaWYgKF9zdHJ1Y3R1cmVbbl0gaW5zdGFuY2VvZiBBbmltYXRpb25TZXF1ZW5jZSkge1xyXG4gICAgICAgICAgbGV0IHNlcXVlbmNlOiBBbmltYXRpb25TZXF1ZW5jZSA9IDxBbmltYXRpb25TZXF1ZW5jZT5fc3RydWN0dXJlW25dO1xyXG4gICAgICAgICAgaWYgKHNlcXVlbmNlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IHNlcXVlbmNlVGltZTogbnVtYmVyID0gc2VxdWVuY2UuZ2V0S2V5KHNlcXVlbmNlLmxlbmd0aCAtIDEpLlRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMudG90YWxUaW1lID0gc2VxdWVuY2VUaW1lID4gdGhpcy50b3RhbFRpbWUgPyBzZXF1ZW5jZVRpbWUgOiB0aGlzLnRvdGFsVGltZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvclRpbWUoPEFuaW1hdGlvblN0cnVjdHVyZT5fc3RydWN0dXJlW25dKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEVuc3VyZXMgdGhlIGV4aXN0YW5jZSBvZiB0aGUgcmVxdWVzdGVkIFtbQW5pbWF0aW9uU3RyY3V0dXJlXV0gYW5kIHJldHVybnMgaXQuXHJcbiAgICAgKiBAcGFyYW0gX3R5cGUgdGhlIHR5cGUgb2YgdGhlIHN0cnVjdHVyZSB0byBnZXRcclxuICAgICAqIEByZXR1cm5zIHRoZSByZXF1ZXN0ZWQgW1tBbmltYXRpb25TdHJ1Y3R1cmVdXVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldFByb2Nlc3NlZEFuaW1hdGlvblN0cnVjdHVyZShfdHlwZTogQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFKTogQW5pbWF0aW9uU3RydWN0dXJlIHtcclxuICAgICAgaWYgKCF0aGlzLmFuaW1hdGlvblN0cnVjdHVyZXNQcm9jZXNzZWQuaGFzKF90eXBlKSkge1xyXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XHJcbiAgICAgICAgbGV0IGFlOiBBbmltYXRpb25TdHJ1Y3R1cmUgPSB7fTtcclxuICAgICAgICBzd2l0Y2ggKF90eXBlKSB7XHJcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgIGFlID0gdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRTpcclxuICAgICAgICAgICAgYWUgPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlLCB0aGlzLmNhbGN1bGF0ZVJldmVyc2VTZXF1ZW5jZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SQVNURVJFRDpcclxuICAgICAgICAgICAgYWUgPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlLCB0aGlzLmNhbGN1bGF0ZVJhc3RlcmVkU2VxdWVuY2UuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRURSRVZFUlNFOlxyXG4gICAgICAgICAgICBhZSA9IHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JOZXdTdHJ1Y3R1cmUodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJFVkVSU0UpLCB0aGlzLmNhbGN1bGF0ZVJhc3RlcmVkU2VxdWVuY2UuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmFuaW1hdGlvblN0cnVjdHVyZXNQcm9jZXNzZWQuc2V0KF90eXBlLCBhZSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlc1Byb2Nlc3NlZC5nZXQoX3R5cGUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRW5zdXJlcyB0aGUgZXhpc3RhbmNlIG9mIHRoZSByZXF1ZXN0ZWQgW1tBbmltYXRpb25FdmVudFRyaWdnZXJdXSBhbmQgcmV0dXJucyBpdC5cclxuICAgICAqIEBwYXJhbSBfdHlwZSBUaGUgdHlwZSBvZiBBbmltYXRpb25FdmVudFRyaWdnZXIgdG8gZ2V0XHJcbiAgICAgKiBAcmV0dXJucyB0aGUgcmVxdWVzdGVkIFtbQW5pbWF0aW9uRXZlbnRUcmlnZ2VyXV1cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBnZXRQcm9jZXNzZWRFdmVudFRyaWdnZXIoX3R5cGU6IEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSk6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciB7XHJcbiAgICAgIGlmICghdGhpcy5ldmVudHNQcm9jZXNzZWQuaGFzKF90eXBlKSkge1xyXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XHJcbiAgICAgICAgbGV0IGV2OiBBbmltYXRpb25FdmVudFRyaWdnZXIgPSB7fTtcclxuICAgICAgICBzd2l0Y2ggKF90eXBlKSB7XHJcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgIGV2ID0gdGhpcy5ldmVudHM7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRTpcclxuICAgICAgICAgICAgZXYgPSB0aGlzLmNhbGN1bGF0ZVJldmVyc2VFdmVudFRyaWdnZXJzKHRoaXMuZXZlbnRzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SQVNURVJFRDpcclxuICAgICAgICAgICAgZXYgPSB0aGlzLmNhbGN1bGF0ZVJhc3RlcmVkRXZlbnRUcmlnZ2Vycyh0aGlzLmV2ZW50cyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRURSRVZFUlNFOlxyXG4gICAgICAgICAgICBldiA9IHRoaXMuY2FsY3VsYXRlUmFzdGVyZWRFdmVudFRyaWdnZXJzKHRoaXMuZ2V0UHJvY2Vzc2VkRXZlbnRUcmlnZ2VyKEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SRVZFUlNFKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmV2ZW50c1Byb2Nlc3NlZC5zZXQoX3R5cGUsIGV2KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdGhpcy5ldmVudHNQcm9jZXNzZWQuZ2V0KF90eXBlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyYXZlcnNlcyBhbiBleGlzdGluZyBzdHJ1Y3R1cmUgdG8gYXBwbHkgYSByZWNhbGN1bGF0aW9uIGZ1bmN0aW9uIHRvIHRoZSBBbmltYXRpb25TdHJ1Y3R1cmUgdG8gc3RvcmUgaW4gYSBuZXcgU3RydWN0dXJlLlxyXG4gICAgICogQHBhcmFtIF9vbGRTdHJ1Y3R1cmUgVGhlIG9sZCBzdHJ1Y3R1cmUgdG8gdHJhdmVyc2VcclxuICAgICAqIEBwYXJhbSBfZnVuY3Rpb25Ub1VzZSBUaGUgZnVuY3Rpb24gdG8gdXNlIHRvIHJlY2FsY3VsYXRlZCB0aGUgc3RydWN0dXJlLlxyXG4gICAgICogQHJldHVybnMgQSBuZXcgQW5pbWF0aW9uIFN0cnVjdHVyZSB3aXRoIHRoZSByZWNhbHVsYXRlZCBBbmltYXRpb24gU2VxdWVuY2VzLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKF9vbGRTdHJ1Y3R1cmU6IEFuaW1hdGlvblN0cnVjdHVyZSwgX2Z1bmN0aW9uVG9Vc2U6IEZ1bmN0aW9uKTogQW5pbWF0aW9uU3RydWN0dXJlIHtcclxuICAgICAgbGV0IG5ld1N0cnVjdHVyZTogQW5pbWF0aW9uU3RydWN0dXJlID0ge307XHJcbiAgICAgIGZvciAobGV0IG4gaW4gX29sZFN0cnVjdHVyZSkge1xyXG4gICAgICAgIGlmIChfb2xkU3RydWN0dXJlW25dIGluc3RhbmNlb2YgQW5pbWF0aW9uU2VxdWVuY2UpIHtcclxuICAgICAgICAgIG5ld1N0cnVjdHVyZVtuXSA9IF9mdW5jdGlvblRvVXNlKF9vbGRTdHJ1Y3R1cmVbbl0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBuZXdTdHJ1Y3R1cmVbbl0gPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKDxBbmltYXRpb25TdHJ1Y3R1cmU+X29sZFN0cnVjdHVyZVtuXSwgX2Z1bmN0aW9uVG9Vc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbmV3U3RydWN0dXJlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIHJldmVyc2VkIEFuaW1hdGlvbiBTZXF1ZW5jZSBvdXQgb2YgYSBnaXZlbiBTZXF1ZW5jZS5cclxuICAgICAqIEBwYXJhbSBfc2VxdWVuY2UgVGhlIHNlcXVlbmNlIHRvIGNhbGN1bGF0ZSB0aGUgbmV3IHNlcXVlbmNlIG91dCBvZlxyXG4gICAgICogQHJldHVybnMgVGhlIHJldmVyc2VkIFNlcXVlbmNlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2FsY3VsYXRlUmV2ZXJzZVNlcXVlbmNlKF9zZXF1ZW5jZTogQW5pbWF0aW9uU2VxdWVuY2UpOiBBbmltYXRpb25TZXF1ZW5jZSB7XHJcbiAgICAgIGxldCBzZXE6IEFuaW1hdGlvblNlcXVlbmNlID0gbmV3IEFuaW1hdGlvblNlcXVlbmNlKCk7XHJcbiAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBfc2VxdWVuY2UubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBsZXQgb2xkS2V5OiBBbmltYXRpb25LZXkgPSBfc2VxdWVuY2UuZ2V0S2V5KGkpO1xyXG4gICAgICAgIGxldCBrZXk6IEFuaW1hdGlvbktleSA9IG5ldyBBbmltYXRpb25LZXkodGhpcy50b3RhbFRpbWUgLSBvbGRLZXkuVGltZSwgb2xkS2V5LlZhbHVlLCBvbGRLZXkuU2xvcGVPdXQsIG9sZEtleS5TbG9wZUluLCBvbGRLZXkuQ29uc3RhbnQpO1xyXG4gICAgICAgIHNlcS5hZGRLZXkoa2V5KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc2VxO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIHJhc3RlcmVkIFtbQW5pbWF0aW9uU2VxdWVuY2VdXSBvdXQgb2YgYSBnaXZlbiBzZXF1ZW5jZS5cclxuICAgICAqIEBwYXJhbSBfc2VxdWVuY2UgVGhlIHNlcXVlbmNlIHRvIGNhbGN1bGF0ZSB0aGUgbmV3IHNlcXVlbmNlIG91dCBvZlxyXG4gICAgICogQHJldHVybnMgdGhlIHJhc3RlcmVkIHNlcXVlbmNlLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNhbGN1bGF0ZVJhc3RlcmVkU2VxdWVuY2UoX3NlcXVlbmNlOiBBbmltYXRpb25TZXF1ZW5jZSk6IEFuaW1hdGlvblNlcXVlbmNlIHtcclxuICAgICAgbGV0IHNlcTogQW5pbWF0aW9uU2VxdWVuY2UgPSBuZXcgQW5pbWF0aW9uU2VxdWVuY2UoKTtcclxuICAgICAgbGV0IGZyYW1lVGltZTogbnVtYmVyID0gMTAwMCAvIHRoaXMuZnJhbWVzUGVyU2Vjb25kO1xyXG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgdGhpcy50b3RhbFRpbWU7IGkgKz0gZnJhbWVUaW1lKSB7XHJcbiAgICAgICAgbGV0IGtleTogQW5pbWF0aW9uS2V5ID0gbmV3IEFuaW1hdGlvbktleShpLCBfc2VxdWVuY2UuZXZhbHVhdGUoaSksIDAsIDAsIHRydWUpO1xyXG4gICAgICAgIHNlcS5hZGRLZXkoa2V5KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc2VxO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIG5ldyByZXZlcnNlZCBbW0FuaW1hdGlvbkV2ZW50VHJpZ2dlcl1dIG9iamVjdCBiYXNlZCBvbiB0aGUgZ2l2ZW4gb25lLiAgXHJcbiAgICAgKiBAcGFyYW0gX2V2ZW50cyB0aGUgZXZlbnQgb2JqZWN0IHRvIGNhbGN1bGF0ZSB0aGUgbmV3IG9uZSBvdXQgb2ZcclxuICAgICAqIEByZXR1cm5zIHRoZSByZXZlcnNlZCBldmVudCBvYmplY3RcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjYWxjdWxhdGVSZXZlcnNlRXZlbnRUcmlnZ2VycyhfZXZlbnRzOiBBbmltYXRpb25FdmVudFRyaWdnZXIpOiBBbmltYXRpb25FdmVudFRyaWdnZXIge1xyXG4gICAgICBsZXQgYWU6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHt9O1xyXG4gICAgICBmb3IgKGxldCBuYW1lIGluIF9ldmVudHMpIHtcclxuICAgICAgICBhZVtuYW1lXSA9IHRoaXMudG90YWxUaW1lIC0gX2V2ZW50c1tuYW1lXTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gYWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBhIHJhc3RlcmVkIFtbQW5pbWF0aW9uRXZlbnRUcmlnZ2VyXV0gb2JqZWN0IGJhc2VkIG9uIHRoZSBnaXZlbiBvbmUuICBcclxuICAgICAqIEBwYXJhbSBfZXZlbnRzIHRoZSBldmVudCBvYmplY3QgdG8gY2FsY3VsYXRlIHRoZSBuZXcgb25lIG91dCBvZlxyXG4gICAgICogQHJldHVybnMgdGhlIHJhc3RlcmVkIGV2ZW50IG9iamVjdFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNhbGN1bGF0ZVJhc3RlcmVkRXZlbnRUcmlnZ2VycyhfZXZlbnRzOiBBbmltYXRpb25FdmVudFRyaWdnZXIpOiBBbmltYXRpb25FdmVudFRyaWdnZXIge1xyXG4gICAgICBsZXQgYWU6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHt9O1xyXG4gICAgICBsZXQgZnJhbWVUaW1lOiBudW1iZXIgPSAxMDAwIC8gdGhpcy5mcmFtZXNQZXJTZWNvbmQ7XHJcbiAgICAgIGZvciAobGV0IG5hbWUgaW4gX2V2ZW50cykge1xyXG4gICAgICAgIGFlW25hbWVdID0gX2V2ZW50c1tuYW1lXSAtIChfZXZlbnRzW25hbWVdICUgZnJhbWVUaW1lKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gYWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQ2hlY2tzIHdoaWNoIGV2ZW50cyBsYXkgYmV0d2VlbiB0d28gZ2l2ZW4gdGltZXMgYW5kIHJldHVybnMgdGhlIG5hbWVzIG9mIHRoZSBvbmVzIHRoYXQgZG8uXHJcbiAgICAgKiBAcGFyYW0gX2V2ZW50VHJpZ2dlcnMgVGhlIGV2ZW50IG9iamVjdCB0byBjaGVjayB0aGUgZXZlbnRzIGluc2lkZSBvZlxyXG4gICAgICogQHBhcmFtIF9taW4gdGhlIG1pbmltdW0gb2YgdGhlIHJhbmdlIHRvIGNoZWNrIGJldHdlZW4gKGluY2x1c2l2ZSlcclxuICAgICAqIEBwYXJhbSBfbWF4IHRoZSBtYXhpbXVtIG9mIHRoZSByYW5nZSB0byBjaGVjayBiZXR3ZWVuIChleGNsdXNpdmUpXHJcbiAgICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiB0aGUgbmFtZXMgb2YgdGhlIGV2ZW50cyBpbiB0aGUgZ2l2ZW4gcmFuZ2UuIFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNoZWNrRXZlbnRzQmV0d2VlbihfZXZlbnRUcmlnZ2VyczogQW5pbWF0aW9uRXZlbnRUcmlnZ2VyLCBfbWluOiBudW1iZXIsIF9tYXg6IG51bWJlcik6IHN0cmluZ1tdIHtcclxuICAgICAgbGV0IGV2ZW50c1RvVHJpZ2dlcjogc3RyaW5nW10gPSBbXTtcclxuICAgICAgZm9yIChsZXQgbmFtZSBpbiBfZXZlbnRUcmlnZ2Vycykge1xyXG4gICAgICAgIGlmIChfbWluIDw9IF9ldmVudFRyaWdnZXJzW25hbWVdICYmIF9ldmVudFRyaWdnZXJzW25hbWVdIDwgX21heCkge1xyXG4gICAgICAgICAgZXZlbnRzVG9UcmlnZ2VyLnB1c2gobmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBldmVudHNUb1RyaWdnZXI7XHJcbiAgICB9XHJcbiAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHNcIi8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9NdXRhYmxlLnRzXCIvPlxyXG5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlcyB0aGUgdmFsdWVzIGJldHdlZW4gW1tBbmltYXRpb25LZXldXXMuXHJcbiAgICogUmVwcmVzZW50ZWQgaW50ZXJuYWxseSBieSBhIGN1YmljIGZ1bmN0aW9uIChgZih4KSA9IGF4wrMgKyBieMKyICsgY3ggKyBkYCkuIFxyXG4gICAqIE9ubHkgbmVlZHMgdG8gYmUgcmVjYWxjdWxhdGVkIHdoZW4gdGhlIGtleXMgY2hhbmdlLCBzbyBhdCBydW50aW1lIGl0IHNob3VsZCBvbmx5IGJlIGNhbGN1bGF0ZWQgb25jZS5cclxuICAgKiBAYXV0aG9yIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XHJcbiAgICovXHJcbiAgZXhwb3J0IGNsYXNzIEFuaW1hdGlvbkZ1bmN0aW9uIHtcclxuICAgIHByaXZhdGUgYTogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgYjogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgYzogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgZDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUga2V5SW46IEFuaW1hdGlvbktleTtcclxuICAgIHByaXZhdGUga2V5T3V0OiBBbmltYXRpb25LZXk7XHJcblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKF9rZXlJbjogQW5pbWF0aW9uS2V5LCBfa2V5T3V0OiBBbmltYXRpb25LZXkgPSBudWxsKSB7XHJcbiAgICAgIHRoaXMua2V5SW4gPSBfa2V5SW47XHJcbiAgICAgIHRoaXMua2V5T3V0ID0gX2tleU91dDtcclxuICAgICAgdGhpcy5jYWxjdWxhdGUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBhdCB0aGUgZ2l2ZW4gdGltZS5cclxuICAgICAqIEBwYXJhbSBfdGltZSB0aGUgcG9pbnQgaW4gdGltZSBhdCB3aGljaCB0byBldmFsdWF0ZSB0aGUgZnVuY3Rpb24gaW4gbWlsbGlzZWNvbmRzLiBXaWxsIGJlIGNvcnJlY3RlZCBmb3Igb2Zmc2V0IGludGVybmFsbHkuXHJcbiAgICAgKiBAcmV0dXJucyB0aGUgdmFsdWUgYXQgdGhlIGdpdmVuIHRpbWVcclxuICAgICAqL1xyXG4gICAgZXZhbHVhdGUoX3RpbWU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgIF90aW1lIC09IHRoaXMua2V5SW4uVGltZTtcclxuICAgICAgbGV0IHRpbWUyOiBudW1iZXIgPSBfdGltZSAqIF90aW1lO1xyXG4gICAgICBsZXQgdGltZTM6IG51bWJlciA9IHRpbWUyICogX3RpbWU7XHJcbiAgICAgIHJldHVybiB0aGlzLmEgKiB0aW1lMyArIHRoaXMuYiAqIHRpbWUyICsgdGhpcy5jICogX3RpbWUgKyB0aGlzLmQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IHNldEtleUluKF9rZXlJbjogQW5pbWF0aW9uS2V5KSB7XHJcbiAgICAgIHRoaXMua2V5SW4gPSBfa2V5SW47XHJcbiAgICAgIHRoaXMuY2FsY3VsYXRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IHNldEtleU91dChfa2V5T3V0OiBBbmltYXRpb25LZXkpIHtcclxuICAgICAgdGhpcy5rZXlPdXQgPSBfa2V5T3V0O1xyXG4gICAgICB0aGlzLmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogKFJlLSlDYWxjdWxhdGVzIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjdWJpYyBmdW5jdGlvbi5cclxuICAgICAqIFNlZSBodHRwczovL21hdGguc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzMxNzM0NjkvY2FsY3VsYXRlLWN1YmljLWVxdWF0aW9uLWZyb20tdHdvLXBvaW50cy1hbmQtdHdvLXNsb3Blcy12YXJpYWJseVxyXG4gICAgICogYW5kIGh0dHBzOi8vamlya2FkZWxsb3JvLmdpdGh1Yi5pby9GVURHRS9Eb2N1bWVudGF0aW9uL0xvZ3MvMTkwNDEwX05vdGl6ZW5fTFNcclxuICAgICAqL1xyXG4gICAgY2FsY3VsYXRlKCk6IHZvaWQge1xyXG4gICAgICBpZiAoIXRoaXMua2V5SW4pIHtcclxuICAgICAgICB0aGlzLmQgPSB0aGlzLmMgPSB0aGlzLmIgPSB0aGlzLmEgPSAwO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBpZiAoIXRoaXMua2V5T3V0IHx8IHRoaXMua2V5SW4uQ29uc3RhbnQpIHtcclxuICAgICAgICB0aGlzLmQgPSB0aGlzLmtleUluLlZhbHVlO1xyXG4gICAgICAgIHRoaXMuYyA9IHRoaXMuYiA9IHRoaXMuYSA9IDA7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsZXQgeDE6IG51bWJlciA9IHRoaXMua2V5T3V0LlRpbWUgLSB0aGlzLmtleUluLlRpbWU7XHJcblxyXG4gICAgICB0aGlzLmQgPSB0aGlzLmtleUluLlZhbHVlO1xyXG4gICAgICB0aGlzLmMgPSB0aGlzLmtleUluLlNsb3BlT3V0O1xyXG5cclxuICAgICAgdGhpcy5hID0gKC14MSAqICh0aGlzLmtleUluLlNsb3BlT3V0ICsgdGhpcy5rZXlPdXQuU2xvcGVJbikgLSAyICogdGhpcy5rZXlJbi5WYWx1ZSArIDIgKiB0aGlzLmtleU91dC5WYWx1ZSkgLyAtTWF0aC5wb3coeDEsIDMpO1xyXG4gICAgICB0aGlzLmIgPSAodGhpcy5rZXlPdXQuU2xvcGVJbiAtIHRoaXMua2V5SW4uU2xvcGVPdXQgLSAzICogdGhpcy5hICogTWF0aC5wb3coeDEsIDIpKSAvICgyICogeDEpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvU2VyaWFsaXplci50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL011dGFibGUudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAvKipcclxuICAgKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCBzZXQgcG9pbnRzIGluIHRpbWUsIHRoZWlyIGFjY29tcGFueWluZyB2YWx1ZXMgYXMgd2VsbCBhcyB0aGVpciBzbG9wZXMuIFxyXG4gICAqIEFsc28gaG9sZHMgYSByZWZlcmVuY2UgdG8gdGhlIFtbQW5pbWF0aW9uRnVuY3Rpb25dXXMgdGhhdCBjb21lIGluIGFuZCBvdXQgb2YgdGhlIHNpZGVzLiBUaGUgW1tBbmltYXRpb25GdW5jdGlvbl1dcyBhcmUgaGFuZGxlZCBieSB0aGUgW1tBbmltYXRpb25TZXF1ZW5jZV1dcy5cclxuICAgKiBTYXZlZCBpbnNpZGUgYW4gW1tBbmltYXRpb25TZXF1ZW5jZV1dLlxyXG4gICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcclxuICAgKi9cclxuICBleHBvcnQgY2xhc3MgQW5pbWF0aW9uS2V5IGV4dGVuZHMgTXV0YWJsZSBpbXBsZW1lbnRzIFNlcmlhbGl6YWJsZSB7XHJcbiAgICAvLyBUT0RPOiBjaGVjayBpZiBmdW5jdGlvbkluIGNhbiBiZSByZW1vdmVkXHJcbiAgICAvKipEb24ndCBtb2RpZnkgdGhpcyB1bmxlc3MgeW91IGtub3cgd2hhdCB5b3UncmUgZG9pbmcuKi9cclxuICAgIGZ1bmN0aW9uSW46IEFuaW1hdGlvbkZ1bmN0aW9uO1xyXG4gICAgLyoqRG9uJ3QgbW9kaWZ5IHRoaXMgdW5sZXNzIHlvdSBrbm93IHdoYXQgeW91J3JlIGRvaW5nLiovXHJcbiAgICBmdW5jdGlvbk91dDogQW5pbWF0aW9uRnVuY3Rpb247XHJcbiAgICBcclxuICAgIGJyb2tlbjogYm9vbGVhbjtcclxuXHJcbiAgICBwcml2YXRlIHRpbWU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgdmFsdWU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgY29uc3RhbnQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBwcml2YXRlIHNsb3BlSW46IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIHNsb3BlT3V0OiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKF90aW1lOiBudW1iZXIgPSAwLCBfdmFsdWU6IG51bWJlciA9IDAsIF9zbG9wZUluOiBudW1iZXIgPSAwLCBfc2xvcGVPdXQ6IG51bWJlciA9IDAsIF9jb25zdGFudDogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICAgIHN1cGVyKCk7XHJcbiAgICAgIHRoaXMudGltZSA9IF90aW1lO1xyXG4gICAgICB0aGlzLnZhbHVlID0gX3ZhbHVlO1xyXG4gICAgICB0aGlzLnNsb3BlSW4gPSBfc2xvcGVJbjtcclxuICAgICAgdGhpcy5zbG9wZU91dCA9IF9zbG9wZU91dDtcclxuICAgICAgdGhpcy5jb25zdGFudCA9IF9jb25zdGFudDtcclxuXHJcbiAgICAgIHRoaXMuYnJva2VuID0gdGhpcy5zbG9wZUluICE9IC10aGlzLnNsb3BlT3V0O1xyXG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0ID0gbmV3IEFuaW1hdGlvbkZ1bmN0aW9uKHRoaXMsIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBUaW1lKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLnRpbWU7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IFRpbWUoX3RpbWU6IG51bWJlcikge1xyXG4gICAgICB0aGlzLnRpbWUgPSBfdGltZTtcclxuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xyXG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0LmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBWYWx1ZSgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy52YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgVmFsdWUoX3ZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgdGhpcy52YWx1ZSA9IF92YWx1ZTtcclxuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xyXG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0LmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBnZXQgQ29uc3RhbnQoKTogYm9vbGVhbiB7XHJcbiAgICAgIHJldHVybiB0aGlzLmNvbnN0YW50O1xyXG4gICAgfVxyXG5cclxuICAgIHNldCBDb25zdGFudChfY29uc3RhbnQ6IGJvb2xlYW4pIHtcclxuICAgICAgdGhpcy5jb25zdGFudCA9IF9jb25zdGFudDtcclxuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xyXG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0LmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBTbG9wZUluKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLnNsb3BlSW47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNldCBTbG9wZUluKF9zbG9wZTogbnVtYmVyKSB7XHJcbiAgICAgIHRoaXMuc2xvcGVJbiA9IF9zbG9wZTtcclxuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBTbG9wZU91dCgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy5zbG9wZU91dDtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgU2xvcGVPdXQoX3Nsb3BlOiBudW1iZXIpIHtcclxuICAgICAgdGhpcy5zbG9wZU91dCA9IF9zbG9wZTtcclxuICAgICAgdGhpcy5mdW5jdGlvbk91dC5jYWxjdWxhdGUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFN0YXRpYyBjb21wYXJhdGlvbiBmdW5jdGlvbiB0byB1c2UgaW4gYW4gYXJyYXkgc29ydCBmdW5jdGlvbiB0byBzb3J0IHRoZSBrZXlzIGJ5IHRoZWlyIHRpbWUuXHJcbiAgICAgKiBAcGFyYW0gX2EgdGhlIGFuaW1hdGlvbiBrZXkgdG8gY2hlY2tcclxuICAgICAqIEBwYXJhbSBfYiB0aGUgYW5pbWF0aW9uIGtleSB0byBjaGVjayBhZ2FpbnN0XHJcbiAgICAgKiBAcmV0dXJucyA+MCBpZiBhPmIsIDAgaWYgYT1iLCA8MCBpZiBhPGJcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGNvbXBhcmUoX2E6IEFuaW1hdGlvbktleSwgX2I6IEFuaW1hdGlvbktleSk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiBfYS50aW1lIC0gX2IudGltZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gdHJhbnNmZXJcclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IHM6IFNlcmlhbGl6YXRpb24gPSB7fTtcclxuICAgICAgcy50aW1lID0gdGhpcy50aW1lO1xyXG4gICAgICBzLnZhbHVlID0gdGhpcy52YWx1ZTtcclxuICAgICAgcy5zbG9wZUluID0gdGhpcy5zbG9wZUluO1xyXG4gICAgICBzLnNsb3BlT3V0ID0gdGhpcy5zbG9wZU91dDtcclxuICAgICAgcy5jb25zdGFudCA9IHRoaXMuY29uc3RhbnQ7XHJcbiAgICAgIHJldHVybiBzO1xyXG4gICAgfVxyXG5cclxuICAgIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgdGhpcy50aW1lID0gX3NlcmlhbGl6YXRpb24udGltZTtcclxuICAgICAgdGhpcy52YWx1ZSA9IF9zZXJpYWxpemF0aW9uLnZhbHVlO1xyXG4gICAgICB0aGlzLnNsb3BlSW4gPSBfc2VyaWFsaXphdGlvbi5zbG9wZUluO1xyXG4gICAgICB0aGlzLnNsb3BlT3V0ID0gX3NlcmlhbGl6YXRpb24uc2xvcGVPdXQ7XHJcbiAgICAgIHRoaXMuY29uc3RhbnQgPSBfc2VyaWFsaXphdGlvbi5jb25zdGFudDtcclxuXHJcbiAgICAgIHRoaXMuYnJva2VuID0gdGhpcy5zbG9wZUluICE9IC10aGlzLnNsb3BlT3V0O1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TXV0YXRvcigpOiBNdXRhdG9yIHtcclxuICAgICAgcmV0dXJuIHRoaXMuc2VyaWFsaXplKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgLy9cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICB9XHJcblxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHNcIi8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9NdXRhYmxlLnRzXCIvPlxyXG5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgLyoqXHJcbiAgICogQSBzZXF1ZW5jZSBvZiBbW0FuaW1hdGlvbktleV1dcyB0aGF0IGlzIG1hcHBlZCB0byBhbiBhdHRyaWJ1dGUgb2YgYSBbW05vZGVdXSBvciBpdHMgW1tDb21wb25lbnRdXXMgaW5zaWRlIHRoZSBbW0FuaW1hdGlvbl1dLlxyXG4gICAqIFByb3ZpZGVzIGZ1bmN0aW9ucyB0byBtb2RpZnkgc2FpZCBrZXlzXHJcbiAgICogQGF1dGhvciBMdWthcyBTY2hldWVybGUsIEhGVSwgMjAxOVxyXG4gICAqL1xyXG4gIGV4cG9ydCBjbGFzcyBBbmltYXRpb25TZXF1ZW5jZSBleHRlbmRzIE11dGFibGUgaW1wbGVtZW50cyBTZXJpYWxpemFibGUge1xyXG4gICAgcHJpdmF0ZSBrZXlzOiBBbmltYXRpb25LZXlbXSA9IFtdO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXZhbHVhdGVzIHRoZSBzZXF1ZW5jZSBhdCB0aGUgZ2l2ZW4gcG9pbnQgaW4gdGltZS5cclxuICAgICAqIEBwYXJhbSBfdGltZSB0aGUgcG9pbnQgaW4gdGltZSBhdCB3aGljaCB0byBldmFsdWF0ZSB0aGUgc2VxdWVuY2UgaW4gbWlsbGlzZWNvbmRzLlxyXG4gICAgICogQHJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBzZXF1ZW5jZSBhdCB0aGUgZ2l2ZW4gdGltZS4gMCBpZiB0aGVyZSBhcmUgbm8ga2V5cy5cclxuICAgICAqL1xyXG4gICAgZXZhbHVhdGUoX3RpbWU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgIGlmICh0aGlzLmtleXMubGVuZ3RoID09IDApXHJcbiAgICAgICAgcmV0dXJuIDA7IC8vVE9ETzogc2hvdWxkbid0IHJldHVybiAwIGJ1dCBzb21ldGhpbmcgaW5kaWNhdGluZyBubyBjaGFuZ2UsIGxpa2UgbnVsbC4gcHJvYmFibHkgbmVlZHMgdG8gYmUgY2hhbmdlZCBpbiBOb2RlIGFzIHdlbGwgdG8gaWdub3JlIG5vbi1udW1lcmljIHZhbHVlcyBpbiB0aGUgYXBwbHlBbmltYXRpb24gZnVuY3Rpb25cclxuICAgICAgaWYgKHRoaXMua2V5cy5sZW5ndGggPT0gMSB8fCB0aGlzLmtleXNbMF0uVGltZSA+PSBfdGltZSlcclxuICAgICAgICByZXR1cm4gdGhpcy5rZXlzWzBdLlZhbHVlO1xyXG5cclxuXHJcbiAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCB0aGlzLmtleXMubGVuZ3RoIC0gMTsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRoaXMua2V5c1tpXS5UaW1lIDw9IF90aW1lICYmIHRoaXMua2V5c1tpICsgMV0uVGltZSA+IF90aW1lKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5rZXlzW2ldLmZ1bmN0aW9uT3V0LmV2YWx1YXRlKF90aW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXMua2V5c1t0aGlzLmtleXMubGVuZ3RoIC0gMV0uVmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGRzIGEgbmV3IGtleSB0byB0aGUgc2VxdWVuY2UuXHJcbiAgICAgKiBAcGFyYW0gX2tleSB0aGUga2V5IHRvIGFkZFxyXG4gICAgICovXHJcbiAgICBhZGRLZXkoX2tleTogQW5pbWF0aW9uS2V5KTogdm9pZCB7XHJcbiAgICAgIHRoaXMua2V5cy5wdXNoKF9rZXkpO1xyXG4gICAgICB0aGlzLmtleXMuc29ydChBbmltYXRpb25LZXkuY29tcGFyZSk7XHJcbiAgICAgIHRoaXMucmVnZW5lcmF0ZUZ1bmN0aW9ucygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyBhIGdpdmVuIGtleSBmcm9tIHRoZSBzZXF1ZW5jZS5cclxuICAgICAqIEBwYXJhbSBfa2V5IHRoZSBrZXkgdG8gcmVtb3ZlXHJcbiAgICAgKi9cclxuICAgIHJlbW92ZUtleShfa2V5OiBBbmltYXRpb25LZXkpOiB2b2lkIHtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHRoaXMua2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmICh0aGlzLmtleXNbaV0gPT0gX2tleSkge1xyXG4gICAgICAgICAgdGhpcy5rZXlzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgIHRoaXMucmVnZW5lcmF0ZUZ1bmN0aW9ucygpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyB0aGUgQW5pbWF0aW9uIEtleSBhdCB0aGUgZ2l2ZW4gaW5kZXggZnJvbSB0aGUga2V5cy5cclxuICAgICAqIEBwYXJhbSBfaW5kZXggdGhlIHplcm8tYmFzZWQgaW5kZXggYXQgd2hpY2ggdG8gcmVtb3ZlIHRoZSBrZXlcclxuICAgICAqIEByZXR1cm5zIHRoZSByZW1vdmVkIEFuaW1hdGlvbktleSBpZiBzdWNjZXNzZnVsLCBudWxsIG90aGVyd2lzZS5cclxuICAgICAqL1xyXG4gICAgcmVtb3ZlS2V5QXRJbmRleChfaW5kZXg6IG51bWJlcik6IEFuaW1hdGlvbktleSB7XHJcbiAgICAgIGlmIChfaW5kZXggPCAwIHx8IF9pbmRleCA+PSB0aGlzLmtleXMubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuICAgICAgbGV0IGFrOiBBbmltYXRpb25LZXkgPSB0aGlzLmtleXNbX2luZGV4XTtcclxuICAgICAgdGhpcy5rZXlzLnNwbGljZShfaW5kZXgsIDEpO1xyXG4gICAgICB0aGlzLnJlZ2VuZXJhdGVGdW5jdGlvbnMoKTtcclxuICAgICAgcmV0dXJuIGFrO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0cyBhIGtleSBmcm9tIHRoZSBzZXF1ZW5jZSBhdCB0aGUgZGVzaXJlZCBpbmRleC5cclxuICAgICAqIEBwYXJhbSBfaW5kZXggdGhlIHplcm8tYmFzZWQgaW5kZXggYXQgd2hpY2ggdG8gZ2V0IHRoZSBrZXlcclxuICAgICAqIEByZXR1cm5zIHRoZSBBbmltYXRpb25LZXkgYXQgdGhlIGluZGV4IGlmIGl0IGV4aXN0cywgbnVsbCBvdGhlcndpc2UuXHJcbiAgICAgKi9cclxuICAgIGdldEtleShfaW5kZXg6IG51bWJlcik6IEFuaW1hdGlvbktleSB7XHJcbiAgICAgIGlmIChfaW5kZXggPCAwIHx8IF9pbmRleCA+PSB0aGlzLmtleXMubGVuZ3RoKVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICByZXR1cm4gdGhpcy5rZXlzW19pbmRleF07XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy5rZXlzLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gdHJhbnNmZXJcclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IHM6IFNlcmlhbGl6YXRpb24gPSB7XHJcbiAgICAgICAga2V5czogW10sXHJcbiAgICAgICAgYW5pbWF0aW9uU2VxdWVuY2U6IHRydWVcclxuICAgICAgfTtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHRoaXMua2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHMua2V5c1tpXSA9IHRoaXMua2V5c1tpXS5zZXJpYWxpemUoKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcztcclxuICAgIH1cclxuICAgIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IF9zZXJpYWxpemF0aW9uLmtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAvLyB0aGlzLmtleXMucHVzaCg8QW5pbWF0aW9uS2V5PlNlcmlhbGl6ZXIuZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb24ua2V5c1tpXSkpO1xyXG4gICAgICAgIGxldCBrOiBBbmltYXRpb25LZXkgPSBuZXcgQW5pbWF0aW9uS2V5KCk7XHJcbiAgICAgICAgay5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbi5rZXlzW2ldKTtcclxuICAgICAgICB0aGlzLmtleXNbaV0gPSBrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnJlZ2VuZXJhdGVGdW5jdGlvbnMoKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xyXG4gICAgICAvL1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVdGlsaXR5IGZ1bmN0aW9uIHRoYXQgKHJlLSlnZW5lcmF0ZXMgYWxsIGZ1bmN0aW9ucyBpbiB0aGUgc2VxdWVuY2UuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgcmVnZW5lcmF0ZUZ1bmN0aW9ucygpOiB2b2lkIHtcclxuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHRoaXMua2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGxldCBmOiBBbmltYXRpb25GdW5jdGlvbiA9IG5ldyBBbmltYXRpb25GdW5jdGlvbih0aGlzLmtleXNbaV0pO1xyXG4gICAgICAgIHRoaXMua2V5c1tpXS5mdW5jdGlvbk91dCA9IGY7XHJcbiAgICAgICAgaWYgKGkgPT0gdGhpcy5rZXlzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgIC8vVE9ETzogY2hlY2sgaWYgdGhpcyBpcyBldmVuIHVzZWZ1bC4gTWF5YmUgdXBkYXRlIHRoZSBydW5jb25kaXRpb24gdG8gbGVuZ3RoIC0gMSBpbnN0ZWFkLiBNaWdodCBiZSByZWR1bmRhbnQgaWYgZnVuY3Rpb25JbiBpcyByZW1vdmVkLCBzZWUgVE9ETyBpbiBBbmltYXRpb25LZXkuXHJcbiAgICAgICAgICBmLnNldEtleU91dCA9IHRoaXMua2V5c1swXTtcclxuICAgICAgICAgIHRoaXMua2V5c1swXS5mdW5jdGlvbkluID0gZjtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmLnNldEtleU91dCA9IHRoaXMua2V5c1tpICsgMV07XHJcbiAgICAgICAgdGhpcy5rZXlzW2kgKyAxXS5mdW5jdGlvbkluID0gZjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gIC8qKlxyXG4gICAqIEBhdXRob3JzIFRob21hcyBEb3JuZXIsIEhGVSwgMjAxOSB8IEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDIwXHJcbiAgICovXHJcbiAgZXhwb3J0IGNsYXNzIEF1ZGlvIGV4dGVuZHMgQXVkaW9CdWZmZXIge1xyXG4gICAgLy8gY29uc3RydWN0b3IoX3VybDogc3RyaW5nLCBfb3B0aW9uczogQXVkaW9CdWZmZXJPcHRpb25zKSB7XHJcbiAgICAvLyAgIHN1cGVyKF9vcHRpb25zKTtcclxuICAgIC8vICAgcmV0dXJuIGF3YWl0IEF1ZGlvLmxvYWQoX3VybCk7XHJcbiAgICAvLyByZXR1cm4gdGhpcztcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGxvYWQoX3VybDogc3RyaW5nKTogUHJvbWlzZTxBdWRpbz4ge1xyXG4gICAgICBjb25zdCByZXNwb25zZTogUmVzcG9uc2UgPSBhd2FpdCB3aW5kb3cuZmV0Y2goX3VybCk7XHJcbiAgICAgIGNvbnN0IGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlciA9IGF3YWl0IHJlc3BvbnNlLmFycmF5QnVmZmVyKCk7XHJcbiAgICAgIHJldHVybiA8QXVkaW8+KGF3YWl0IEF1ZGlvTWFuYWdlci5kZWZhdWx0LmRlY29kZUF1ZGlvRGF0YShhcnJheUJ1ZmZlcikpO1xyXG4gICAgfVxyXG4gIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRkIGFuIFtbQXVkaW9EZWxheV1dIHRvIGFuIFtbQXVkaW9dXVxyXG4gICAgICogQGF1dGhvcnMgVGhvbWFzIERvcm5lciwgSEZVLCAyMDE5XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBBdWRpb0RlbGF5IHtcclxuXHJcbiAgICAgICAgcHVibGljIGF1ZGlvRGVsYXk6IERlbGF5Tm9kZTtcclxuICAgICAgICBwcml2YXRlIGRlbGF5OiBudW1iZXI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9kZWxheTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9EZWxheSA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmNyZWF0ZURlbGF5KF9kZWxheSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0RGVsYXkoX2F1ZGlvU2V0dGluZ3MsIF9kZWxheSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RGVsYXkoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9kZWxheTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuZGVsYXkgPSBfZGVsYXk7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9EZWxheS5kZWxheVRpbWUuc2V0VmFsdWVBdFRpbWUodGhpcy5kZWxheSwgX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3VycmVudFRpbWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERlbGF5KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlbGF5O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIEFsbCBwb3NzaWJsZSBGaWx0ZXIgVHlwZXMgb2YgYW4gQXVkaW8gRmlsdGVyXHJcbiAgICAgKi9cclxuICAgIHR5cGUgRklMVEVSX1RZUEUgPSBcImxvd3Bhc3NcIiB8IFwiaGlnaHBhc3NcIiB8IFwiYmFuZHBhc3NcIiB8IFwibG93c2hlbGZcIiB8IFwiaGlnaHNoZWxmXCIgfCBcInBlYWtpbmdcIiB8IFwibm90Y2hcIiB8IFwiYWxscGFzc1wiO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWRkIGFuIFtbQXVkaW9GaWx0ZXJdXSB0byBhbiBbW0F1ZGlvXV1cclxuICAgICAqIEBhdXRob3JzIFRob21hcyBEb3JuZXIsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXVkaW9GaWx0ZXIge1xyXG5cclxuICAgICAgICBwdWJsaWMgYXVkaW9GaWx0ZXI6IEJpcXVhZEZpbHRlck5vZGU7IFxyXG4gICAgICAgIHByaXZhdGUgZmlsdGVyVHlwZTogRklMVEVSX1RZUEU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9maWx0ZXJUeXBlOiBGSUxURVJfVFlQRSwgX2ZyZXF1ZW5jeTogbnVtYmVyLCBfZ2FpbjogbnVtYmVyLCBfcXVhbGl0eTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdEZpbHRlcihfYXVkaW9TZXR0aW5ncywgX2ZpbHRlclR5cGUsIF9mcmVxdWVuY3ksIF9nYWluLCBfcXVhbGl0eSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgaW5pdEZpbHRlcihfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX2ZpbHRlclR5cGU6IEZJTFRFUl9UWVBFLCBfZnJlcXVlbmN5OiBudW1iZXIsIF9nYWluOiBudW1iZXIsIF9xdWFsaXR5OiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0ZpbHRlciA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEZpbHRlclR5cGUoX2ZpbHRlclR5cGUpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEZyZXF1ZW5jeShfYXVkaW9TZXR0aW5ncywgX2ZyZXF1ZW5jeSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0R2FpbihfYXVkaW9TZXR0aW5ncywgX2dhaW4pO1xyXG4gICAgICAgICAgICB0aGlzLnNldFF1YWxpdHkoX3F1YWxpdHkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEZpbHRlclR5cGUoX2ZpbHRlclR5cGU6IEZJTFRFUl9UWVBFKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsdGVyVHlwZSA9IF9maWx0ZXJUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvRmlsdGVyLnR5cGUgPSB0aGlzLmZpbHRlclR5cGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RmlsdGVyVHlwZSgpOiBGSUxURVJfVFlQRSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlclR5cGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RnJlcXVlbmN5KF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfZnJlcXVlbmN5OiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0ZpbHRlci5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoX2ZyZXF1ZW5jeSwgX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3VycmVudFRpbWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEZyZXF1ZW5jeSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb0ZpbHRlci5mcmVxdWVuY3kudmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBzZXRHYWluKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfZ2FpbjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9GaWx0ZXIuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKF9nYWluLCBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0R2FpbigpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb0ZpbHRlci5nYWluLnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgc2V0UXVhbGl0eShfcXVhbGl0eTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9GaWx0ZXIuUS52YWx1ZSA9IF9xdWFsaXR5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFF1YWxpdHkoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXVkaW9GaWx0ZXIuUS52YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBQYW5uaW5nIE1vZGVsIFR5cGUgZm9yIDNEIGxvY2FsaXNhdGlvbiBvZiBhIFtbQ29tcG9uZW50QXVkaW9dXS5cclxuICAgICAqIEBwYXJhbSBIUkZUIFVzdWFsbHkgdXNlZCBmb3IgM0Qgd29ybGQgc3BhY2UsIHRoaXMgd2lsbCBiZSB0aGUgZGVmYXVsdCBzZXR0aW5nXHJcbiAgICAgKi9cclxuICAgIHR5cGUgUEFOTklOR19NT0RFTF9UWVBFID0gXCJlcXVhbHBvd2VyXCIgfCBcIkhSVEZcIjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIERpc3RhbmNlIE1vZGVsIFR5cGUgZm9yIDNEIGxvY2FsaXNhdGlvbiBvZiBhIFtbQ29tcG9uZW50QXVkaW9dXS5cclxuICAgICAqIEBwYXJhbSBpbnZlcnNlIFVzdWFsbHkgdXNlZCBmb3Igdm9sdW1lIGRyb3Agb2Ygc291bmQgaW4gM0Qgd29ybGQgc3BhY2VcclxuICAgICAqL1xyXG4gICAgdHlwZSBESVNUQU5DRV9NT0RFTF9UWVBFID0gXCJsaW5lYXJcIiB8IFwiaW52ZXJzZVwiIHwgXCJleHBvbmVudGlhbFwiO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogW1tBdWRpb0xvY2FsaXNhdGlvbl1dIGRlc2NyaWJlcyB0aGUgQXVkaW8gUGFubmVyIHVzZWQgaW4gW1tDb21wb25lbnRBdWRpb11dLCBcclxuICAgICAqIHdoaWNoIGNvbnRhaW5zIGRhdGEgZm9yIFBvc2l0aW9uLCBPcmllbnRhdGlvbiBhbmQgb3RoZXIgZGF0YSBuZWVkZWQgdG8gbG9jYWxpemUgdGhlIEF1ZGlvIGluIGEgM0Qgc3BhY2UuXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF1ZGlvTG9jYWxpc2F0aW9uIHtcclxuXHJcbiAgICAgICAgcHVibGljIHBhbm5lck5vZGU6IFBhbm5lck5vZGU7XHJcblxyXG4gICAgICAgIHByaXZhdGUgcGFubmluZ01vZGVsOiBQQU5OSU5HX01PREVMX1RZUEU7XHJcbiAgICAgICAgcHJpdmF0ZSBkaXN0YW5jZU1vZGVsOiBESVNUQU5DRV9NT0RFTF9UWVBFO1xyXG5cclxuICAgICAgICBwcml2YXRlIHJlZkRpc3RhbmNlOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBtYXhEaXN0YW5jZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgcm9sbG9mZkZhY3RvcjogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgY29uZUlubmVyQW5nbGU6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGNvbmVPdXRlckFuZ2xlOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBjb25lT3V0ZXJHYWluOiBudW1iZXI7XHJcblxyXG4gICAgICAgIHByaXZhdGUgcG9zaXRpb246IFZlY3RvcjM7XHJcbiAgICAgICAgcHJpdmF0ZSBvcmllbnRhdGlvbjogVmVjdG9yMztcclxuICAgICAgICBcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb25zdHJ1Y3RvciBmb3IgdGhlIFtbQXVkaW9Mb2NhbGlzYXRpb25dXSBDbGFzc1xyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9Db250ZXh0IGZyb20gW1tBdWRpb1NldHRpbmdzXV1cclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdHJ1Y3RvcihfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncykge1xyXG4gICAgICAgICAgIHRoaXMucGFubmVyTm9kZSA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmNyZWF0ZVBhbm5lcigpO1xyXG4gICAgICAgICAgIHRoaXMuaW5pdERlZmF1bHRWYWx1ZXMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVQb3NpdGlvbnMoX3Bvc2l0aW9uOiBWZWN0b3IzLCBfb3JpZW50YXRpb246IFZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRQYW5uZXJQb3NpdGlvbihfcG9zaXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLnNldFBhbm5lck9yaWVudGF0aW9uKF9vcmllbnRhdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICAvKipcclxuICAgICAgICAgKiBXZSB3aWxsIGNhbGwgc2V0UGFubmVyUG9zaXRpb24gd2hlbmV2ZXIgdGhlcmUgaXMgYSBuZWVkIHRvIGNoYW5nZSBQb3NpdGlvbnMuXHJcbiAgICAgICAgICogQWxsIHRoZSBwb3NpdGlvbiB2YWx1ZXMgc2hvdWxkIGJlIGlkZW50aWNhbCB0byB0aGUgY3VycmVudCBQb3NpdGlvbiB0aGlzIGlzIGF0dGFjaGVkIHRvLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogICAgICB8ICAgICBcclxuICAgICAgICAgKiAgICAgIG8tLS1cclxuICAgICAgICAgKiAgICAvICBfX1xyXG4gICAgICAgICAqICAgICAgfF98IFBvc2l0aW9uXHJcbiAgICAgICAgICogXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldFBhbm5lclBvc2l0aW9uKF9wb3NpdGlvbjogVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gX3Bvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLnBvc2l0aW9uWC52YWx1ZSA9IC10aGlzLnBvc2l0aW9uLng7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5wb3NpdGlvblkudmFsdWUgPSAtdGhpcy5wb3NpdGlvbi56O1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucG9zaXRpb25aLnZhbHVlID0gdGhpcy5wb3NpdGlvbi55O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFBhbm5lclBvc2l0aW9uKCk6IFZlY3RvcjMge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCBQb3NpdGlvbiBmb3Igb3JpZW50YXRpb24gdGFyZ2V0XHJcbiAgICAgICAgICogXHJcbiAgICAgICAgICogICAgICB8ICAgICBcclxuICAgICAgICAgKiAgICAgIG8tLS1cclxuICAgICAgICAgKiAgICAvICBfX1xyXG4gICAgICAgICAqICAgICAgfF98XHJcbiAgICAgICAgICogICAgICAgIFxcXHJcbiAgICAgICAgICogICAgICAgVGFyZ2V0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldFBhbm5lck9yaWVudGF0aW9uKF9vcmllbnRhdGlvbjogVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gX29yaWVudGF0aW9uO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLm9yaWVudGF0aW9uWC52YWx1ZSA9IHRoaXMub3JpZW50YXRpb24ueDtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLm9yaWVudGF0aW9uWS52YWx1ZSA9IC10aGlzLm9yaWVudGF0aW9uLno7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5vcmllbnRhdGlvbloudmFsdWUgPSB0aGlzLm9yaWVudGF0aW9uLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0UGFubmVyT3JpZW50YXRpb24oKTogVmVjdG9yMyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9yaWVudGF0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldERpc3RhbmNlTW9kZWwoX2Rpc3RhbmNlTW9kZWxUeXBlOiBESVNUQU5DRV9NT0RFTF9UWVBFKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzdGFuY2VNb2RlbCA9IF9kaXN0YW5jZU1vZGVsVHlwZTtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLmRpc3RhbmNlTW9kZWwgPSB0aGlzLmRpc3RhbmNlTW9kZWw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RGlzdGFuY2VNb2RlbCgpOiBESVNUQU5DRV9NT0RFTF9UWVBFIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlzdGFuY2VNb2RlbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRQYW5uaW5nTW9kZWwoX3Bhbm5pbmdNb2RlbFR5cGU6IFBBTk5JTkdfTU9ERUxfVFlQRSk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5pbmdNb2RlbCA9IF9wYW5uaW5nTW9kZWxUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucGFubmluZ01vZGVsID0gdGhpcy5wYW5uaW5nTW9kZWw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0UGFubmluZ01vZGVsKCk6IFBBTk5JTkdfTU9ERUxfVFlQRSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhbm5pbmdNb2RlbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRSZWZEaXN0YW5jZShfcmVmRGlzdGFuY2U6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnJlZkRpc3RhbmNlID0gX3JlZkRpc3RhbmNlO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucmVmRGlzdGFuY2UgPSB0aGlzLnJlZkRpc3RhbmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFJlZkRpc3RhbmNlKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlZkRpc3RhbmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldE1heERpc3RhbmNlKF9tYXhEaXN0YW5jZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubWF4RGlzdGFuY2UgPSBfbWF4RGlzdGFuY2U7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5tYXhEaXN0YW5jZSA9IHRoaXMubWF4RGlzdGFuY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TWF4RGlzdGFuY2UoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWF4RGlzdGFuY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Um9sbG9mZkZhY3Rvcihfcm9sbG9mZkZhY3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucm9sbG9mZkZhY3RvciA9IF9yb2xsb2ZmRmFjdG9yO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucm9sbG9mZkZhY3RvciA9IHRoaXMucm9sbG9mZkZhY3RvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRSb2xsb2ZmRmFjdG9yKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJvbGxvZmZGYWN0b3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29uZUlubmVyQW5nbGUoX2NvbmVJbm5lckFuZ2xlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5jb25lSW5uZXJBbmdsZSA9IF9jb25lSW5uZXJBbmdsZTtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLmNvbmVJbm5lckFuZ2xlID0gdGhpcy5jb25lSW5uZXJBbmdsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRDb25lSW5uZXJBbmdsZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25lSW5uZXJBbmdsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRDb25lT3V0ZXJBbmdsZShfY29uZU91dGVyQW5nbGU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmVPdXRlckFuZ2xlID0gX2NvbmVPdXRlckFuZ2xlO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUuY29uZU91dGVyQW5nbGUgPSB0aGlzLmNvbmVPdXRlckFuZ2xlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldENvbmVPdXRlckFuZ2xlKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmVPdXRlckFuZ2xlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldENvbmVPdXRlckdhaW4oX2NvbmVPdXRlckdhaW46IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmVPdXRlckdhaW4gPSBfY29uZU91dGVyR2FpbjtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLmNvbmVPdXRlckdhaW4gPSB0aGlzLmNvbmVPdXRlckdhaW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0Q29uZU91dGVyR2FpbigpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25lT3V0ZXJHYWluO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2hvdyBhbGwgU2V0dGluZ3MgaW5zaWRlIG9mIFtbQXVkaW9Mb2NhbGlzYXRpb25dXS5cclxuICAgICAgICAgKiBVc2UgZm9yIERlYnVnZ2luZyBwdXJwb3Nlcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2hvd0xvY2FsaXNhdGlvblNldHRpbmdzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTaG93IGFsbCBTZXR0aW5ncyBvZiBQYW5uZXJcIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXCIpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBhbm5lciBQb3NpdGlvbjogWDogXCIgKyB0aGlzLnBhbm5lck5vZGUucG9zaXRpb25YLnZhbHVlICsgXCIgfCBZOiBcIiArIHRoaXMucGFubmVyTm9kZS5wb3NpdGlvblkudmFsdWUgKyBcIiB8IFo6IFwiICsgdGhpcy5wYW5uZXJOb2RlLnBvc2l0aW9uWi52YWx1ZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGFubmVyIE9yaWVudGF0aW9uOiBYOiBcIiArIHRoaXMucGFubmVyTm9kZS5vcmllbnRhdGlvblgudmFsdWUgKyBcIiB8IFk6IFwiICsgdGhpcy5wYW5uZXJOb2RlLm9yaWVudGF0aW9uWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLnBhbm5lck5vZGUub3JpZW50YXRpb25aLnZhbHVlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJEaXN0YW5jZSBNb2RlbCBUeXBlOiBcIiArIHRoaXMuZGlzdGFuY2VNb2RlbCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGFubmVyIE1vZGVsIFR5cGU6IFwiICsgdGhpcy5wYW5uaW5nTW9kZWwpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlZiBEaXN0YW5jZTogXCIgKyB0aGlzLnJlZkRpc3RhbmNlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJNYXggRGlzdGFuY2U6IFwiICsgdGhpcy5tYXhEaXN0YW5jZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUm9sbG9mZiBGYWN0b3I6IFwiICsgdGhpcy5yb2xsb2ZmRmFjdG9yKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25lIElubmVyIEFuZ2xlOiBcIiArIHRoaXMuY29uZUlubmVyQW5nbGUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbmUgT3V0ZXIgQW5nbGU6IFwiICsgdGhpcy5jb25lT3V0ZXJBbmdsZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29uZSBPdXRlciBHYWluOiBcIiArIHRoaXMuY29uZU91dGVyR2Fpbik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0RGVmYXVsdFZhbHVlcygpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRQYW5uaW5nTW9kZWwoXCJIUlRGXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldERpc3RhbmNlTW9kZWwoXCJpbnZlcnNlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldENvbmVJbm5lckFuZ2xlKDM2MCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29uZU91dGVyQW5nbGUoMCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29uZU91dGVyR2FpbigxKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRSZWZEaXN0YW5jZSgxKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRNYXhEaXN0YW5jZSg1KTtcclxuICAgICAgICAgICAgdGhpcy5zZXRSb2xsb2ZmRmFjdG9yKDEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zaG93TG9jYWxpc2F0aW9uU2V0dGluZ3MoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICBleHBvcnQgY2xhc3MgQXVkaW9NYW5hZ2VyIGV4dGVuZHMgQXVkaW9Db250ZXh0IHtcclxuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgZGVmYXVsdDogQXVkaW9NYW5hZ2VyID0gbmV3IEF1ZGlvTWFuYWdlcih7IGxhdGVuY3lIaW50OiBcImludGVyYWN0aXZlXCIsIHNhbXBsZVJhdGU6IDQ0MTAwIH0pO1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGdhaW46IEF1ZGlvTm9kZTtcclxuICAgIHByaXZhdGUgYnJhbmNoOiBOb2RlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGNvbnRleHRPcHRpb25zPzogQXVkaW9Db250ZXh0T3B0aW9ucykge1xyXG4gICAgICBzdXBlcihjb250ZXh0T3B0aW9ucyk7XHJcbiAgICAgIHRoaXMuZ2FpbiA9IHRoaXMuY3JlYXRlR2FpbigpO1xyXG4gICAgICB0aGlzLmdhaW4uY29ubmVjdCh0aGlzLmRlc3RpbmF0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgbGlzdGVuVG8gPSAoX2JyYW5jaDogTm9kZSB8IG51bGwpOiB2b2lkID0+IHtcclxuICAgICAgaWYgKHRoaXMuYnJhbmNoKVxyXG4gICAgICAgIHRoaXMuYnJhbmNoLmJyb2FkY2FzdEV2ZW50KG5ldyBFdmVudChFVkVOVF9BVURJTy5DSElMRF9SRU1PVkUpKTtcclxuICAgICAgaWYgKCFfYnJhbmNoKVxyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgdGhpcy5icmFuY2ggPSBfYnJhbmNoO1xyXG4gICAgICB0aGlzLmJyYW5jaC5icm9hZGNhc3RFdmVudChuZXcgRXZlbnQoRVZFTlRfQVVESU8uQ0hJTERfQVBQRU5EKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldEJyYW5jaExpc3RlbmluZ1RvID0gKCk6IE5vZGUgPT4ge1xyXG4gICAgICByZXR1cm4gdGhpcy5icmFuY2g7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVwZGF0ZSA9ICgpOiB2b2lkID0+IHtcclxuICAgICAgdGhpcy5icmFuY2guYnJvYWRjYXN0RXZlbnQobmV3IEV2ZW50KEVWRU5UX0FVRElPLlVQREFURV9QQU5ORVIpKTtcclxuICAgIH1cclxuICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBFbnVtZXJhdG9yIGZvciBhbGwgcG9zc2libGUgT3NjaWxsYXRvciBUeXBlc1xyXG4gICAgICovXHJcbiAgICB0eXBlIE9TQ0lMTEFUT1JfVFlQRSA9IFwic2luZVwiIHwgXCJzcXVhcmVcIiB8IFwic2F3dG9vdGhcIiB8IFwidHJpYW5nbGVcIiB8IFwiY3VzdG9tXCI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbnRlcmZhY2UgdG8gY3JlYXRlIEN1c3RvbSBPc2NpbGxhdG9yIFR5cGVzLlxyXG4gICAgICogU3RhcnQtL0VuZHBvaW50IG9mIGEgY3VzdHVtIGN1cnZlIGUuZy4gc2luZSBjdXJ2ZS5cclxuICAgICAqIEJvdGggcGFyYW1ldGVycyBuZWVkIHRvIGJlIGluYmV0d2VlbiAtMSBhbmQgMS5cclxuICAgICAqIEBwYXJhbSBzdGFydHBvaW50IHN0YXJ0cG9pbnQgb2YgYSBjdXJ2ZSBcclxuICAgICAqIEBwYXJhbSBlbmRwb2ludCBFbmRwb2ludCBvZiBhIGN1cnZlIFxyXG4gICAgICovXHJcbiAgICBpbnRlcmZhY2UgT3NjaWxsYXRvcldhdmUge1xyXG4gICAgICAgIHN0YXJ0cG9pbnQ6IG51bWJlcjtcclxuICAgICAgICBlbmRwb2ludDogbnVtYmVyO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGQgYW4gW1tBdWRpb0ZpbHRlcl1dIHRvIGFuIFtbQXVkaW9dXVxyXG4gICAgICogQGF1dGhvcnMgVGhvbWFzIERvcm5lciwgSEZVLCAyMDE5XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBBdWRpb09zY2lsbGF0b3Ige1xyXG5cclxuICAgICAgICBwdWJsaWMgYXVkaW9Pc2NpbGxhdG9yOiBPc2NpbGxhdG9yTm9kZTsgXHJcblxyXG4gICAgICAgIHByaXZhdGUgZnJlcXVlbmN5OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBvc2NpbGxhdG9yVHlwZTogT1NDSUxMQVRPUl9UWVBFO1xyXG4gICAgICAgIHByaXZhdGUgb3NjaWxsYXRvcldhdmU6IFBlcmlvZGljV2F2ZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBsb2NhbEdhaW46IEdhaW5Ob2RlO1xyXG4gICAgICAgIHByaXZhdGUgbG9jYWxHYWluVmFsdWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9vc2NpbGxhdG9yVHlwZT86IE9TQ0lMTEFUT1JfVFlQRSkge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvT3NjaWxsYXRvciA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmNyZWF0ZU9zY2lsbGF0b3IoKTtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4gPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVHYWluKCk7XHJcbiAgICAgICAgICAgIHRoaXMub3NjaWxsYXRvclR5cGUgPSBfb3NjaWxsYXRvclR5cGU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9zY2lsbGF0b3JUeXBlICE9IFwiY3VzdG9tXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLnR5cGUgPSB0aGlzLm9zY2lsbGF0b3JUeXBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9zY2lsbGF0b3JXYXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdWRpb09zY2lsbGF0b3Iuc2V0UGVyaW9kaWNXYXZlKHRoaXMub3NjaWxsYXRvcldhdmUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGUgYSBDdXN0b20gUGVyaW9kaWMgV2F2ZSBmaXJzdCB0byB1c2UgQ3VzdG9tIFR5cGVcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRPc2NpbGxhdG9yVHlwZShfb3NjaWxsYXRvclR5cGU6IE9TQ0lMTEFUT1JfVFlQRSk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vc2NpbGxhdG9yVHlwZSAhPSBcImN1c3RvbVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvT3NjaWxsYXRvci50eXBlID0gdGhpcy5vc2NpbGxhdG9yVHlwZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vc2NpbGxhdG9yV2F2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLnNldFBlcmlvZGljV2F2ZSh0aGlzLm9zY2lsbGF0b3JXYXZlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldE9zY2lsbGF0b3JUeXBlKCk6IE9TQ0lMTEFUT1JfVFlQRSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9zY2lsbGF0b3JUeXBlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNyZWF0ZVBlcmlvZGljV2F2ZShfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX3JlYWw6IE9zY2lsbGF0b3JXYXZlLCBfaW1hZzogT3NjaWxsYXRvcldhdmUpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IHdhdmVSZWFsOiBGbG9hdDMyQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KDIpO1xyXG4gICAgICAgICAgICB3YXZlUmVhbFswXSA9IF9yZWFsLnN0YXJ0cG9pbnQ7XHJcbiAgICAgICAgICAgIHdhdmVSZWFsWzFdID0gX3JlYWwuZW5kcG9pbnQ7XHJcblxyXG4gICAgICAgICAgICBsZXQgd2F2ZUltYWc6IEZsb2F0MzJBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoMik7XHJcbiAgICAgICAgICAgIHdhdmVJbWFnWzBdID0gX2ltYWcuc3RhcnRwb2ludDtcclxuICAgICAgICAgICAgd2F2ZUltYWdbMV0gPSBfaW1hZy5lbmRwb2ludDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub3NjaWxsYXRvcldhdmUgPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVQZXJpb2RpY1dhdmUod2F2ZVJlYWwsIHdhdmVJbWFnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRMb2NhbEdhaW4oX2xvY2FsR2FpbjogR2Fpbk5vZGUpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4gPSBfbG9jYWxHYWluO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldExvY2FsR2FpbigpOiBHYWluTm9kZSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsR2FpbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRMb2NhbEdhaW5WYWx1ZShfbG9jYWxHYWluVmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmxvY2FsR2FpblZhbHVlID0gX2xvY2FsR2FpblZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLmxvY2FsR2Fpbi5nYWluLnZhbHVlID0gdGhpcy5sb2NhbEdhaW5WYWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRMb2NhbEdhaW5WYWx1ZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbEdhaW5WYWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRGcmVxdWVuY3koX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9mcmVxdWVuY3k6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmZyZXF1ZW5jeSA9IF9mcmVxdWVuY3k7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZSh0aGlzLmZyZXF1ZW5jeSwgX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3VycmVudFRpbWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEZyZXF1ZW5jeSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mcmVxdWVuY3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY3JlYXRlU25hcmUoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRPc2NpbGxhdG9yVHlwZShcInRyaWFuZ2xlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEZyZXF1ZW5jeShfYXVkaW9TZXR0aW5ncywgMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRMb2NhbEdhaW5WYWx1ZSgwKTtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLCBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAxLCBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSArIC4xKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLmNvbm5lY3QodGhpcy5sb2NhbEdhaW4pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gICAgLyoqXHJcbiAgICAgKiBJbnRlcmZhY2UgdG8gZ2VuZXJhdGUgRGF0YSBQYWlycyBvZiBVUkwgYW5kIEF1ZGlvQnVmZmVyXHJcbiAgICAgKi9cclxuICAgIGludGVyZmFjZSBBdWRpb0RhdGEge1xyXG4gICAgICAgIHVybDogc3RyaW5nO1xyXG4gICAgICAgIGJ1ZmZlcjogQXVkaW9CdWZmZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZXNjcmliZXMgRGF0YSBIYW5kbGVyIGZvciBhbGwgQXVkaW8gU291cmNlc1xyXG4gICAgICogQGF1dGhvcnMgVGhvbWFzIERvcm5lciwgSEZVLCAyMDE5XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBBdWRpb1Nlc3Npb25EYXRhIHtcclxuXHJcbiAgICAgICAgcHVibGljIGRhdGFBcnJheTogQXVkaW9EYXRhW107XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnN0cnVjdG9yIG9mIHRoZSBbW0F1ZGlvU2Vzc2lvbkRhdGFdXSBDbGFzcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgdGhpcy5kYXRhQXJyYXkgPSBuZXcgQXJyYXkoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERlY29kaW5nIEF1ZGlvIERhdGEgXHJcbiAgICAgICAgICogQXN5bmNocm9ub3VzIEZ1bmN0aW9uIHRvIHBlcm1pdCB0aGUgbG9hZGluZyBvZiBtdWx0aXBsZSBEYXRhIFNvdXJjZXMgYXQgdGhlIHNhbWUgdGltZVxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9Db250ZXh0IEF1ZGlvQ29udGV4dCBmcm9tIEF1ZGlvU2V0dGluZ3NcclxuICAgICAgICAgKiBAcGFyYW0gX3VybCBVUkwgYXMgU3RyaW5nIGZvciBEYXRhIGZldGNoaW5nXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGFzeW5jIHVybFRvQnVmZmVyKF9hdWRpb0NvbnRleHQ6IEF1ZGlvQ29udGV4dCwgX3VybDogc3RyaW5nKTogUHJvbWlzZTxBdWRpb0J1ZmZlcj4ge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0IGluaXRPYmplY3Q6IFJlcXVlc3RJbml0ID0ge1xyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgbW9kZTogXCJzYW1lLW9yaWdpblwiLCAvL2RlZmF1bHQgLT4gc2FtZS1vcmlnaW5cclxuICAgICAgICAgICAgICAgIGNhY2hlOiBcIm5vLWNhY2hlXCIsIC8vZGVmYXVsdCAtPiBkZWZhdWx0IFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXVkaW8vbXBlZzNcIlxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHJlZGlyZWN0OiBcImZvbGxvd1wiIC8vIGRlZmF1bHQgLT4gZm9sbG93XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBsZXQgYnVmZmVyOiBBdWRpb0J1ZmZlciA9IG51bGw7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHg6IG51bWJlciA9IDA7IHggPCB0aGlzLmRhdGFBcnJheS5sZW5ndGg7IHgrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YUFycmF5W3hdLnVybCA9PSBfdXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFeGlzdGluZyBVUkwgZm91bmRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YUFycmF5W3hdLmJ1ZmZlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlOiBSZXNwb25zZSA9IGF3YWl0IHdpbmRvdy5mZXRjaChfdXJsLCBpbml0T2JqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyID0gYXdhaXQgcmVzcG9uc2UuYXJyYXlCdWZmZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZEF1ZGlvOiBBdWRpb0J1ZmZlciA9IGF3YWl0IF9hdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGFycmF5QnVmZmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoQnVmZmVySW5BcnJheShfdXJsLCBkZWNvZGVkQXVkaW8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlZEF1ZGlvO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gYXdhaXQgdGhpcy5kYXRhQXJyYXlbeF0uYnVmZmVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhQXJyYXlbeF0uYnVmZmVyO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYnVmZmVyID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVXJsSW5BcnJheShfdXJsKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZTogUmVzcG9uc2UgPSBhd2FpdCB3aW5kb3cuZmV0Y2goX3VybCwgaW5pdE9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyID0gYXdhaXQgcmVzcG9uc2UuYXJyYXlCdWZmZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkQXVkaW86IEF1ZGlvQnVmZmVyID0gYXdhaXQgX2F1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEoYXJyYXlCdWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEJ1ZmZlckluQXJyYXkoX3VybCwgZGVjb2RlZEF1ZGlvKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlZEF1ZGlvO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoX2Vycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dFcnJvckZldGNoKF9lcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBQdXNoIFVSTCBpbnRvIERhdGEgQXJyYXkgdG8gY3JlYXRlIGEgUGxhY2Vob2xkZXIgaW4gd2hpY2ggdGhlIEJ1ZmZlciBjYW4gYmUgcGxhY2VkIGF0IGEgbGF0ZXIgdGltZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFxyXG4gICAgICAgICAqIEBwYXJhbSBfdXJsIFxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9CdWZmZXIgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHB1c2hCdWZmZXJJbkFycmF5KF91cmw6IHN0cmluZywgX2F1ZGlvQnVmZmVyOiBBdWRpb0J1ZmZlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB4OiBudW1iZXIgPSAwOyB4IDwgdGhpcy5kYXRhQXJyYXkubGVuZ3RoOyB4KyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFBcnJheVt4XS51cmwgPT0gX3VybCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIgPSBfYXVkaW9CdWZmZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZSBhIG5ldyBsb2cgZm9yIHRoZSBEYXRhIEFycmF5LlxyXG4gICAgICAgICAqIFVzZXMgYSB1cmwgYW5kIGNyZWF0ZXMgYSBwbGFjZWhvbGRlciBmb3IgdGhlIEF1ZGlvQnVmZmVyLlxyXG4gICAgICAgICAqIFRoZSBBdWRpb0J1ZmZlciBnZXRzIGFkZGVkIGFzIHNvb24gYXMgaXQgaXMgY3JlYXRlZC5cclxuICAgICAgICAgKiBAcGFyYW0gX3VybCBBZGQgYSB1cmwgdG8gYSB3YW50ZWQgcmVzb3VyY2UgYXMgYSBzdHJpbmdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgcHVzaFVybEluQXJyYXkoX3VybDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBkYXRhOiBBdWRpb0RhdGE7XHJcbiAgICAgICAgICAgIGRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IF91cmwsXHJcbiAgICAgICAgICAgICAgICBidWZmZXI6IG51bGxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5kYXRhQXJyYXkucHVzaChkYXRhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNob3cgYWxsIERhdGEgaW4gQXJyYXkuXHJcbiAgICAgICAgICogVXNlIHRoaXMgZm9yIERlYnVnZ2luZyBwdXJwb3Nlcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2hvd0RhdGFJbkFycmF5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB4OiBudW1iZXIgPSAwOyB4IDwgdGhpcy5kYXRhQXJyYXkubGVuZ3RoOyB4KyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXJyYXkgRGF0YTogXCIgKyB0aGlzLmRhdGFBcnJheVt4XS51cmwgKyB0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFcnJvciBNZXNzYWdlIGZvciBEYXRhIEZldGNoaW5nXHJcbiAgICAgICAgICogQHBhcmFtIGUgRXJyb3JcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGxvZ0Vycm9yRmV0Y2goX2Vycm9yOiBFcnJvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvIGVycm9yXCIsIF9lcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIERlc2NyaWJlcyBHbG9iYWwgQXVkaW8gU2V0dGluZ3MuXHJcbiAgICAgKiBJcyBtZWFudCB0byBiZSB1c2VkIGFzIGEgTWVudSBvcHRpb24uXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF1ZGlvU2V0dGluZ3Mge1xyXG4gICAgICAgIFxyXG4gICAgICAgIHB1YmxpYyBtYXN0ZXJHYWluOiBHYWluTm9kZTtcclxuICAgICAgICBwcml2YXRlIG1hc3RlckdhaW5WYWx1ZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBwcml2YXRlIGdsb2JhbEF1ZGlvQ29udGV4dDogQXVkaW9Db250ZXh0O1xyXG4gICAgICAgIHByaXZhdGUgYXVkaW9TZXNzaW9uRGF0YTogQXVkaW9TZXNzaW9uRGF0YTtcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnN0cnVjdG9yIGZvciB0aGUgW1tBdWRpb1NldHRpbmdzXV0gQ2xhc3MuXHJcbiAgICAgICAgICogTWFpbiBjbGFzcyBmb3IgYWxsIEF1ZGlvIENsYXNzZXMuXHJcbiAgICAgICAgICogTmVlZCB0byBjcmVhdGUgdGhpcyBmaXJzdCwgd2hlbiB3b3JraW5nIHdpdGggc291bmRzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldEF1ZGlvQ29udGV4dChuZXcgQXVkaW9Db250ZXh0KHsgbGF0ZW5jeUhpbnQ6IFwiaW50ZXJhY3RpdmVcIiwgc2FtcGxlUmF0ZTogNDQxMDAgfSkpO1xyXG4gICAgICAgICAgICAvL3RoaXMuZ2xvYmFsQXVkaW9Db250ZXh0LnJlc3VtZSgpO1xyXG4gICAgICAgICAgICB0aGlzLm1hc3RlckdhaW4gPSB0aGlzLmdsb2JhbEF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWFzdGVyR2FpblZhbHVlKDEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRBdWRpb1Nlc3Npb24obmV3IEF1ZGlvU2Vzc2lvbkRhdGEoKSk7XHJcbiAgICAgICAgICAgIHRoaXMubWFzdGVyR2Fpbi5jb25uZWN0KHRoaXMuZ2xvYmFsQXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRNYXN0ZXJHYWluVmFsdWUoX21hc3RlckdhaW5WYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubWFzdGVyR2FpblZhbHVlID0gX21hc3RlckdhaW5WYWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5tYXN0ZXJHYWluLmdhaW4udmFsdWUgPSB0aGlzLm1hc3RlckdhaW5WYWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRNYXN0ZXJHYWluVmFsdWUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFzdGVyR2FpblZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEF1ZGlvQ29udGV4dCgpOiBBdWRpb0NvbnRleHQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0QXVkaW9Db250ZXh0KF9hdWRpb0NvbnRleHQ6IEF1ZGlvQ29udGV4dCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmdsb2JhbEF1ZGlvQ29udGV4dCA9IF9hdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0QXVkaW9TZXNzaW9uKCk6IEF1ZGlvU2Vzc2lvbkRhdGEge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb1Nlc3Npb25EYXRhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEF1ZGlvU2Vzc2lvbihfYXVkaW9TZXNzaW9uOiBBdWRpb1Nlc3Npb25EYXRhKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9TZXNzaW9uRGF0YSA9IF9hdWRpb1Nlc3Npb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBQYXVzZXMgdGhlIHByb2dyZXNzaW9uIG9mIHRpbWUgb2YgdGhlIEF1ZGlvQ29udGV4dC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3VzcGVuZEF1ZGlvQ29udGV4dCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQuc3VzcGVuZCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVzdW1lcyB0aGUgcHJvZ3Jlc3Npb24gb2YgdGltZSBvZiB0aGUgQXVkaW9Db250ZXh0IGFmdGVyIHBhdXNpbmcgaXQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHJlc3VtZUF1ZGlvQ29udGV4dCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQucmVzdW1lKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgLyoqXHJcbiAgICogRGVzY3JpYmVzIHRoZSBbW0F1ZGlvXV0gY2xhc3MgaW4gd2hpY2ggYWxsIEF1ZGlvIERhdGEgaXMgc3RvcmVkLlxyXG4gICAqIEF1ZGlvIHdpbGwgYmUgZ2l2ZW4gdG8gdGhlIFtbQ29tcG9uZW50QXVkaW9dXSBmb3IgZnVydGhlciB1c2FnZS5cclxuICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgKi9cclxuICBleHBvcnQgY2xhc3MgQXVkaW9YIHtcclxuXHJcbiAgICBwdWJsaWMgdXJsOiBzdHJpbmc7XHJcblxyXG4gICAgcHVibGljIGF1ZGlvQnVmZmVyOiBBdWRpb0J1ZmZlcjtcclxuICAgIHB1YmxpYyBidWZmZXJTb3VyY2U6IEF1ZGlvQnVmZmVyU291cmNlTm9kZTtcclxuICAgIHByaXZhdGUgbG9jYWxHYWluOiBHYWluTm9kZTtcclxuXHJcbiAgICBwcml2YXRlIGlzTG9vcGluZzogYm9vbGVhbjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbnN0cnVjdG9yIGZvciB0aGUgW1tBdWRpb11dIENsYXNzXHJcbiAgICAgKiBAcGFyYW0gX2F1ZGlvQ29udGV4dCBmcm9tIFtbQXVkaW9TZXR0aW5nc11dXHJcbiAgICAgKiBAcGFyYW0gX2dhaW5WYWx1ZSAwIGZvciBtdXRlZCB8IDEgZm9yIG1heCB2b2x1bWVcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF91cmw6IHN0cmluZywgX2dhaW5WYWx1ZTogbnVtYmVyLCBfbG9vcDogYm9vbGVhbikge1xyXG4gICAgICB0aGlzLmluaXQoX2F1ZGlvU2V0dGluZ3MsIF91cmwsIF9nYWluVmFsdWUsIF9sb29wKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgaW5pdChfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX3VybDogc3RyaW5nLCBfdm9sdW1lOiBudW1iZXIsIF9sb29wOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgIHRoaXMudXJsID0gX3VybDtcclxuICAgICAgLy8gR2V0IEF1ZGlvQnVmZmVyXHJcbiAgICAgIGNvbnN0IHByb21pc2VCdWZmZXI6IFByb21pc2U8QXVkaW9CdWZmZXI+ID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9TZXNzaW9uKCkudXJsVG9CdWZmZXIoX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCksIF91cmwpO1xyXG4gICAgICB3aGlsZSAoIXByb21pc2VCdWZmZXIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIldhaXRpbmcgZm9yIFByb21pc2UuLlwiKTtcclxuICAgICAgfVxyXG4gICAgICBhd2FpdCBwcm9taXNlQnVmZmVyLnRoZW4odmFsID0+IHtcclxuICAgICAgICB0aGlzLmF1ZGlvQnVmZmVyID0gdmFsO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRoaXMubG9jYWxHYWluID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3JlYXRlR2FpbigpO1xyXG4gICAgICB0aGlzLnZvbHVtZSA9IF92b2x1bWU7XHJcbiAgICAgIHRoaXMuY3JlYXRlQXVkaW8oX2F1ZGlvU2V0dGluZ3MsIHRoaXMuYXVkaW9CdWZmZXIpO1xyXG4gICAgICB0aGlzLmlzTG9vcGluZyA9IF9sb29wO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBpbml0QnVmZmVyU291cmNlKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzKTogdm9pZCB7XHJcbiAgICAgIHRoaXMuYnVmZmVyU291cmNlID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3JlYXRlQnVmZmVyU291cmNlKCk7XHJcbiAgICAgIHRoaXMuYnVmZmVyU291cmNlLmJ1ZmZlciA9IHRoaXMuYXVkaW9CdWZmZXI7XHJcbiAgICAgIHRoaXMuYmVnaW5Mb29wKCk7XHJcbiAgICAgIHRoaXMuYnVmZmVyU291cmNlLmNvbm5lY3QodGhpcy5sb2NhbEdhaW4pO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjb25uZWN0KF9hdWRpb05vZGU6IEF1ZGlvTm9kZSk6IHZvaWQge1xyXG4gICAgICB0aGlzLmxvY2FsR2Fpbi5jb25uZWN0KF9hdWRpb05vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgdm9sdW1lKF92b2x1bWU6IG51bWJlcikge1xyXG4gICAgICB0aGlzLmxvY2FsR2Fpbi5nYWluLnZhbHVlID0gX3ZvbHVtZTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IHZvbHVtZSgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy5sb2NhbEdhaW4uZ2Fpbi52YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0TG9vcGluZyhfaXNMb29waW5nOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgIHRoaXMuaXNMb29waW5nID0gX2lzTG9vcGluZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0TG9vcGluZygpOiBib29sZWFuIHtcclxuICAgICAgcmV0dXJuIHRoaXMuaXNMb29waW5nO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXRCdWZmZXJTb3VyY2UoX2J1ZmZlcjogQXVkaW9CdWZmZXIpOiB2b2lkIHtcclxuICAgICAgdGhpcy5hdWRpb0J1ZmZlciA9IF9idWZmZXI7XHJcbiAgICAgIHRoaXMuYnVmZmVyU291cmNlLmJ1ZmZlciA9IF9idWZmZXI7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldEJ1ZmZlclNvdXJjZSgpOiBBdWRpb0J1ZmZlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLmF1ZGlvQnVmZmVyO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlQXVkaW8gYnVpbGRzIGFuIFtbQXVkaW9dXSB0byB1c2Ugd2l0aCB0aGUgW1tDb21wb25lbnRBdWRpb11dXHJcbiAgICAgKiBAcGFyYW0gX2F1ZGlvQ29udGV4dCBmcm9tIFtbQXVkaW9TZXR0aW5nc11dXHJcbiAgICAgKiBAcGFyYW0gX2F1ZGlvQnVmZmVyIGZyb20gW1tBdWRpb1Nlc3Npb25EYXRhXV1cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjcmVhdGVBdWRpbyhfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX2F1ZGlvQnVmZmVyOiBBdWRpb0J1ZmZlcik6IEF1ZGlvQnVmZmVyIHtcclxuICAgICAgdGhpcy5hdWRpb0J1ZmZlciA9IF9hdWRpb0J1ZmZlcjtcclxuICAgICAgdGhpcy5pbml0QnVmZmVyU291cmNlKF9hdWRpb1NldHRpbmdzKTtcclxuICAgICAgcmV0dXJuIHRoaXMuYXVkaW9CdWZmZXI7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBiZWdpbkxvb3AoKTogdm9pZCB7XHJcbiAgICAgIHRoaXMuYnVmZmVyU291cmNlLmxvb3AgPSB0aGlzLmlzTG9vcGluZztcclxuICAgIH1cclxuICB9XHJcbn0iLCIvLzxyZWZlcmVuY2UgcGF0aD1cIi4uL0NvYXRzL0NvYXQudHNcIi8+XHJcbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gIHR5cGUgQ29hdEluamVjdGlvbiA9ICh0aGlzOiBDb2F0LCBfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIpID0+IHZvaWQ7XHJcbiAgZXhwb3J0IGNsYXNzIFJlbmRlckluamVjdG9yIHtcclxuICAgIHByaXZhdGUgc3RhdGljIGNvYXRJbmplY3Rpb25zOiB7IFtjbGFzc05hbWU6IHN0cmluZ106IENvYXRJbmplY3Rpb24gfSA9IHtcclxuICAgICAgXCJDb2F0Q29sb3JlZFwiOiBSZW5kZXJJbmplY3Rvci5pbmplY3RSZW5kZXJEYXRhRm9yQ29hdENvbG9yZWQsXHJcbiAgICAgIFwiQ29hdFRleHR1cmVkXCI6IFJlbmRlckluamVjdG9yLmluamVjdFJlbmRlckRhdGFGb3JDb2F0VGV4dHVyZWQsXHJcbiAgICAgIFwiQ29hdE1hdENhcFwiOiBSZW5kZXJJbmplY3Rvci5pbmplY3RSZW5kZXJEYXRhRm9yQ29hdE1hdENhcFxyXG4gICAgfTtcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIGRlY29yYXRlQ29hdChfY29uc3RydWN0b3I6IEZ1bmN0aW9uKTogdm9pZCB7XHJcbiAgICAgIGxldCBjb2F0SW5qZWN0aW9uOiBDb2F0SW5qZWN0aW9uID0gUmVuZGVySW5qZWN0b3IuY29hdEluamVjdGlvbnNbX2NvbnN0cnVjdG9yLm5hbWVdO1xyXG4gICAgICBpZiAoIWNvYXRJbmplY3Rpb24pIHtcclxuICAgICAgICBEZWJ1Zy5lcnJvcihcIk5vIGluamVjdGlvbiBkZWNvcmF0b3IgZGVmaW5lZCBmb3IgXCIgKyBfY29uc3RydWN0b3IubmFtZSk7XHJcbiAgICAgIH1cclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KF9jb25zdHJ1Y3Rvci5wcm90b3R5cGUsIFwidXNlUmVuZGVyRGF0YVwiLCB7XHJcbiAgICAgICAgdmFsdWU6IGNvYXRJbmplY3Rpb25cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgaW5qZWN0UmVuZGVyRGF0YUZvckNvYXRDb2xvcmVkKHRoaXM6IENvYXQsIF9yZW5kZXJTaGFkZXI6IFJlbmRlclNoYWRlcik6IHZvaWQge1xyXG4gICAgICBsZXQgY29sb3JVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gX3JlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfY29sb3JcIl07XHJcbiAgICAgIC8vIGxldCB7IHIsIGcsIGIsIGEgfSA9ICg8Q29hdENvbG9yZWQ+dGhpcykuY29sb3I7XHJcbiAgICAgIC8vIGxldCBjb2xvcjogRmxvYXQzMkFycmF5ID0gbmV3IEZsb2F0MzJBcnJheShbciwgZywgYiwgYV0pO1xyXG4gICAgICBsZXQgY29sb3I6IEZsb2F0MzJBcnJheSA9ICg8Q29hdENvbG9yZWQ+dGhpcykuY29sb3IuZ2V0QXJyYXkoKTtcclxuICAgICAgUmVuZGVyT3BlcmF0b3IuZ2V0UmVuZGVyaW5nQ29udGV4dCgpLnVuaWZvcm00ZnYoY29sb3JVbmlmb3JtTG9jYXRpb24sIGNvbG9yKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBpbmplY3RSZW5kZXJEYXRhRm9yQ29hdFRleHR1cmVkKHRoaXM6IENvYXQsIF9yZW5kZXJTaGFkZXI6IFJlbmRlclNoYWRlcik6IHZvaWQge1xyXG4gICAgICBsZXQgY3JjMzogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCA9IFJlbmRlck9wZXJhdG9yLmdldFJlbmRlcmluZ0NvbnRleHQoKTtcclxuICAgICAgaWYgKHRoaXMucmVuZGVyRGF0YSkge1xyXG4gICAgICAgIC8vIGJ1ZmZlcnMgZXhpc3RcclxuICAgICAgICBjcmMzLmFjdGl2ZVRleHR1cmUoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFMCk7XHJcbiAgICAgICAgY3JjMy5iaW5kVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIHRoaXMucmVuZGVyRGF0YVtcInRleHR1cmUwXCJdKTtcclxuICAgICAgICBjcmMzLnVuaWZvcm0xaShfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV90ZXh0dXJlXCJdLCAwKTtcclxuICAgICAgICBjcmMzLnVuaWZvcm1NYXRyaXgzZnYoX3JlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfcGl2b3RcIl0sIGZhbHNlLCAoPENvYXRUZXh0dXJlZD50aGlzKS5waXZvdC5nZXQoKSk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJEYXRhID0ge307XHJcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgaWYgYWxsIFdlYkdMLUNyZWF0aW9ucyBhcmUgYXNzZXJ0ZWRcclxuICAgICAgICBjb25zdCB0ZXh0dXJlOiBXZWJHTFRleHR1cmUgPSBSZW5kZXJNYW5hZ2VyLmFzc2VydDxXZWJHTFRleHR1cmU+KGNyYzMuY3JlYXRlVGV4dHVyZSgpKTtcclxuICAgICAgICBjcmMzLmJpbmRUZXh0dXJlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjcmMzLnRleEltYWdlMkQoY3JjMy5URVhUVVJFXzJELCAwLCBjcmMzLlJHQkEsIGNyYzMuUkdCQSwgY3JjMy5VTlNJR05FRF9CWVRFLCAoPENvYXRUZXh0dXJlZD50aGlzKS50ZXh0dXJlLmltYWdlKTtcclxuICAgICAgICAgIGNyYzMudGV4SW1hZ2UyRChcclxuICAgICAgICAgICAgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCAwLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlJHQkEsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuUkdCQSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5VTlNJR05FRF9CWVRFLFxyXG4gICAgICAgICAgICAoPENvYXRUZXh0dXJlZD50aGlzKS50ZXh0dXJlLmltYWdlXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0gY2F0Y2ggKF9lcnJvcikge1xyXG4gICAgICAgICAgRGVidWcuZXJyb3IoX2Vycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3JjMy50ZXhQYXJhbWV0ZXJpKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV8yRCwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFX01BR19GSUxURVIsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuTkVBUkVTVCk7XHJcbiAgICAgICAgY3JjMy50ZXhQYXJhbWV0ZXJpKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV8yRCwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFX01JTl9GSUxURVIsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuTkVBUkVTVCk7XHJcbiAgICAgICAgY3JjMy5nZW5lcmF0ZU1pcG1hcChjcmMzLlRFWFRVUkVfMkQpO1xyXG4gICAgICAgIHRoaXMucmVuZGVyRGF0YVtcInRleHR1cmUwXCJdID0gdGV4dHVyZTtcclxuXHJcbiAgICAgICAgY3JjMy5iaW5kVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIG51bGwpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZVJlbmRlckRhdGEoX3JlbmRlclNoYWRlcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBpbmplY3RSZW5kZXJEYXRhRm9yQ29hdE1hdENhcCh0aGlzOiBDb2F0LCBfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcclxuICAgICAgbGV0IGNyYzM6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQgPSBSZW5kZXJPcGVyYXRvci5nZXRSZW5kZXJpbmdDb250ZXh0KCk7XHJcblxyXG4gICAgICBsZXQgY29sb3JVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gX3JlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfdGludF9jb2xvclwiXTtcclxuICAgICAgbGV0IHsgciwgZywgYiwgYSB9ID0gKDxDb2F0TWF0Q2FwPnRoaXMpLnRpbnRDb2xvcjtcclxuICAgICAgbGV0IHRpbnRDb2xvckFycmF5OiBGbG9hdDMyQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KFtyLCBnLCBiLCBhXSk7XHJcbiAgICAgIGNyYzMudW5pZm9ybTRmdihjb2xvclVuaWZvcm1Mb2NhdGlvbiwgdGludENvbG9yQXJyYXkpO1xyXG5cclxuICAgICAgbGV0IGZsb2F0VW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IF9yZW5kZXJTaGFkZXIudW5pZm9ybXNbXCJ1X2ZsYXRtaXhcIl07XHJcbiAgICAgIGxldCBmbGF0TWl4OiBudW1iZXIgPSAoPENvYXRNYXRDYXA+dGhpcykuZmxhdE1peDtcclxuICAgICAgY3JjMy51bmlmb3JtMWYoZmxvYXRVbmlmb3JtTG9jYXRpb24sIGZsYXRNaXgpO1xyXG5cclxuICAgICAgaWYgKHRoaXMucmVuZGVyRGF0YSkge1xyXG4gICAgICAgIC8vIGJ1ZmZlcnMgZXhpc3RcclxuICAgICAgICBjcmMzLmFjdGl2ZVRleHR1cmUoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFMCk7XHJcbiAgICAgICAgY3JjMy5iaW5kVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIHRoaXMucmVuZGVyRGF0YVtcInRleHR1cmUwXCJdKTtcclxuICAgICAgICBjcmMzLnVuaWZvcm0xaShfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV90ZXh0dXJlXCJdLCAwKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICB0aGlzLnJlbmRlckRhdGEgPSB7fTtcclxuICAgICAgICAvLyBUT0RPOiBjaGVjayBpZiBhbGwgV2ViR0wtQ3JlYXRpb25zIGFyZSBhc3NlcnRlZFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmU6IFdlYkdMVGV4dHVyZSA9IFJlbmRlck1hbmFnZXIuYXNzZXJ0PFdlYkdMVGV4dHVyZT4oY3JjMy5jcmVhdGVUZXh0dXJlKCkpO1xyXG4gICAgICAgIGNyYzMuYmluZFRleHR1cmUoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNyYzMudGV4SW1hZ2UyRChjcmMzLlRFWFRVUkVfMkQsIDAsIGNyYzMuUkdCQSwgY3JjMy5SR0JBLCBjcmMzLlVOU0lHTkVEX0JZVEUsICg8Q29hdE1hdENhcD50aGlzKS50ZXh0dXJlLmltYWdlKTtcclxuICAgICAgICAgIGNyYzMudGV4SW1hZ2UyRChcclxuICAgICAgICAgICAgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCAwLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlJHQkEsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuUkdCQSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5VTlNJR05FRF9CWVRFLFxyXG4gICAgICAgICAgICAoPENvYXRNYXRDYXA+dGhpcykudGV4dHVyZS5pbWFnZVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9IGNhdGNoIChfZXJyb3IpIHtcclxuICAgICAgICAgIERlYnVnLmVycm9yKF9lcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNyYzMudGV4UGFyYW1ldGVyaShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV9NQUdfRklMVEVSLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0Lk5FQVJFU1QpO1xyXG4gICAgICAgIGNyYzMudGV4UGFyYW1ldGVyaShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV9NSU5fRklMVEVSLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0Lk5FQVJFU1QpO1xyXG4gICAgICAgIGNyYzMuZ2VuZXJhdGVNaXBtYXAoY3JjMy5URVhUVVJFXzJEKTtcclxuICAgICAgICB0aGlzLnJlbmRlckRhdGFbXCJ0ZXh0dXJlMFwiXSA9IHRleHR1cmU7XHJcblxyXG4gICAgICAgIGNyYzMuYmluZFRleHR1cmUoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCBudWxsKTtcclxuICAgICAgICB0aGlzLnVzZVJlbmRlckRhdGEoX3JlbmRlclNoYWRlcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQnVmZmVyU3BlY2lmaWNhdGlvbiB7XHJcbiAgICAgICAgc2l6ZTogbnVtYmVyOyAgIC8vIFRoZSBzaXplIG9mIHRoZSBkYXRhc2FtcGxlLlxyXG4gICAgICAgIGRhdGFUeXBlOiBudW1iZXI7IC8vIFRoZSBkYXRhdHlwZSBvZiB0aGUgc2FtcGxlIChlLmcuIGdsLkZMT0FULCBnbC5CWVRFLCBldGMuKVxyXG4gICAgICAgIG5vcm1hbGl6ZTogYm9vbGVhbjsgLy8gRmxhZyB0byBub3JtYWxpemUgdGhlIGRhdGEuXHJcbiAgICAgICAgc3RyaWRlOiBudW1iZXI7IC8vIE51bWJlciBvZiBpbmRpY2VzIHRoYXQgd2lsbCBiZSBza2lwcGVkIGVhY2ggaXRlcmF0aW9uLlxyXG4gICAgICAgIG9mZnNldDogbnVtYmVyOyAvLyBJbmRleCBvZiB0aGUgZWxlbWVudCB0byBiZWdpbiB3aXRoLlxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBSZW5kZXJTaGFkZXIge1xyXG4gICAgICAgIC8vIFRPRE86IGV4YW1pbmUsIGlmIHRoaXMgc2hvdWxkIGJlIGluamVjdGVkIGluIHNoYWRlciBjbGFzcyB2aWEgUmVuZGVySW5qZWN0b3IsIGFzIGRvbmUgd2l0aCBDb2F0XHJcbiAgICAgICAgcHJvZ3JhbTogV2ViR0xQcm9ncmFtO1xyXG4gICAgICAgIGF0dHJpYnV0ZXM6IHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9O1xyXG4gICAgICAgIHVuaWZvcm1zOiB7IFtuYW1lOiBzdHJpbmddOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB9O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyQnVmZmVycyB7XHJcbiAgICAgICAgLy8gVE9ETzogZXhhbWluZSwgaWYgdGhpcyBzaG91bGQgYmUgaW5qZWN0ZWQgaW4gbWVzaCBjbGFzcyB2aWEgUmVuZGVySW5qZWN0b3IsIGFzIGRvbmUgd2l0aCBDb2F0XHJcbiAgICAgICAgdmVydGljZXM6IFdlYkdMQnVmZmVyO1xyXG4gICAgICAgIGluZGljZXM6IFdlYkdMQnVmZmVyO1xyXG4gICAgICAgIG5JbmRpY2VzOiBudW1iZXI7XHJcbiAgICAgICAgdGV4dHVyZVVWczogV2ViR0xCdWZmZXI7XHJcbiAgICAgICAgbm9ybWFsc0ZhY2U6IFdlYkdMQnVmZmVyO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyQ29hdCB7XHJcbiAgICAgICAgLy9UT0RPOiBleGFtaW5lLCBpZiBpdCBtYWtlcyBzZW5zZSB0byBzdG9yZSBhIHZhbyBmb3IgZWFjaCBDb2F0LCBldmVuIHRob3VnaCBlLmcuIGNvbG9yIHdvbid0IGJlIHN0b3JlZCBhbnl3YXkuLi5cclxuICAgICAgICAvL3ZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdDtcclxuICAgICAgICBjb2F0OiBDb2F0O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyTGlnaHRzIHtcclxuICAgICAgICBbdHlwZTogc3RyaW5nXTogRmxvYXQzMkFycmF5O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmFzZSBjbGFzcyBmb3IgUmVuZGVyTWFuYWdlciwgaGFuZGxpbmcgdGhlIGNvbm5lY3Rpb24gdG8gdGhlIHJlbmRlcmluZyBzeXN0ZW0sIGluIHRoaXMgY2FzZSBXZWJHTC5cclxuICAgICAqIE1ldGhvZHMgYW5kIGF0dHJpYnV0ZXMgb2YgdGhpcyBjbGFzcyBzaG91bGQgbm90IGJlIGNhbGxlZCBkaXJlY3RseSwgb25seSB0aHJvdWdoIFtbUmVuZGVyTWFuYWdlcl1dXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZW5kZXJPcGVyYXRvciB7XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBjcmMzOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0O1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIHJlY3RWaWV3cG9ydDogUmVjdGFuZ2xlO1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIHJlbmRlclNoYWRlclJheUNhc3Q6IFJlbmRlclNoYWRlcjtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgKiBDaGVja3MgdGhlIGZpcnN0IHBhcmFtZXRlciBhbmQgdGhyb3dzIGFuIGV4Y2VwdGlvbiB3aXRoIHRoZSBXZWJHTC1lcnJvcmNvZGUgaWYgdGhlIHZhbHVlIGlzIG51bGxcclxuICAgICAgICAqIEBwYXJhbSBfdmFsdWUgLy8gdmFsdWUgdG8gY2hlY2sgYWdhaW5zdCBudWxsXHJcbiAgICAgICAgKiBAcGFyYW0gX21lc3NhZ2UgLy8gb3B0aW9uYWwsIGFkZGl0aW9uYWwgbWVzc2FnZSBmb3IgdGhlIGV4Y2VwdGlvblxyXG4gICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBhc3NlcnQ8VD4oX3ZhbHVlOiBUIHwgbnVsbCwgX21lc3NhZ2U6IHN0cmluZyA9IFwiXCIpOiBUIHtcclxuICAgICAgICAgICAgaWYgKF92YWx1ZSA9PT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uIGZhaWxlZC4gJHtfbWVzc2FnZX0sIFdlYkdMLUVycm9yOiAke1JlbmRlck9wZXJhdG9yLmNyYzMgPyBSZW5kZXJPcGVyYXRvci5jcmMzLmdldEVycm9yKCkgOiBcIlwifWApO1xyXG4gICAgICAgICAgICByZXR1cm4gX3ZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBJbml0aWFsaXplcyBvZmZzY3JlZW4tY2FudmFzLCByZW5kZXJpbmdjb250ZXh0IGFuZCBoYXJkd2FyZSB2aWV3cG9ydC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGluaXRpYWxpemUoX2FudGlhbGlhczogYm9vbGVhbiA9IGZhbHNlLCBfYWxwaGE6IGJvb2xlYW4gPSB0cnVlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBjb250ZXh0QXR0cmlidXRlczogV2ViR0xDb250ZXh0QXR0cmlidXRlcyA9IHsgYWxwaGE6IF9hbHBoYSwgYW50aWFsaWFzOiBfYW50aWFsaWFzLCBwcmVtdWx0aXBsaWVkQWxwaGE6IGZhbHNlIH07XHJcbiAgICAgICAgICAgIGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTDJSZW5kZXJpbmdDb250ZXh0PihcclxuICAgICAgICAgICAgICAgIGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2wyXCIsIGNvbnRleHRBdHRyaWJ1dGVzKSxcclxuICAgICAgICAgICAgICAgIFwiV2ViR0wtY29udGV4dCBjb3VsZG4ndCBiZSBjcmVhdGVkXCJcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgLy8gRW5hYmxlIGJhY2tmYWNlLSBhbmQgekJ1ZmZlci1jdWxsaW5nLlxyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkNVTExfRkFDRSk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZW5hYmxlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuREVQVEhfVEVTVCk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZW5hYmxlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQkxFTkQpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJsZW5kRXF1YXRpb24oV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5GVU5DX0FERCk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmxlbmRGdW5jKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRFNUX0FMUEhBLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0Lk9ORV9NSU5VU19EU1RfQUxQSEEpO1xyXG4gICAgICAgICAgICAvLyBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0Lik7XHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMucGl4ZWxTdG9yZWkoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5VTlBBQ0tfRkxJUF9ZX1dFQkdMLCB0cnVlKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IucmVjdFZpZXdwb3J0ID0gUmVuZGVyT3BlcmF0b3IuZ2V0Q2FudmFzUmVjdCgpO1xyXG5cclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IucmVuZGVyU2hhZGVyUmF5Q2FzdCA9IFJlbmRlck9wZXJhdG9yLmNyZWF0ZVByb2dyYW0oU2hhZGVyUmF5Q2FzdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm4gYSByZWZlcmVuY2UgdG8gdGhlIG9mZnNjcmVlbi1jYW52YXNcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldENhbnZhcygpOiBIVE1MQ2FudmFzRWxlbWVudCB7XHJcbiAgICAgICAgICAgIHJldHVybiA8SFRNTENhbnZhc0VsZW1lbnQ+UmVuZGVyT3BlcmF0b3IuY3JjMy5jYW52YXM7IC8vIFRPRE86IGVuYWJsZSBPZmZzY3JlZW5DYW52YXNcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0dXJuIGEgcmVmZXJlbmNlIHRvIHRoZSByZW5kZXJpbmcgY29udGV4dFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0UmVuZGVyaW5nQ29udGV4dCgpOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0IHtcclxuICAgICAgICAgICAgcmV0dXJuIFJlbmRlck9wZXJhdG9yLmNyYzM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybiBhIHJlY3RhbmdsZSBkZXNjcmliaW5nIHRoZSBzaXplIG9mIHRoZSBvZmZzY3JlZW4tY2FudmFzLiB4LHkgYXJlIDAgYXQgYWxsIHRpbWVzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0Q2FudmFzUmVjdCgpOiBSZWN0YW5nbGUge1xyXG4gICAgICAgICAgICBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IDxIVE1MQ2FudmFzRWxlbWVudD5SZW5kZXJPcGVyYXRvci5jcmMzLmNhbnZhcztcclxuICAgICAgICAgICAgcmV0dXJuIFJlY3RhbmdsZS5HRVQoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0IHRoZSBzaXplIG9mIHRoZSBvZmZzY3JlZW4tY2FudmFzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc2V0Q2FudmFzU2l6ZShfd2lkdGg6IG51bWJlciwgX2hlaWdodDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuY2FudmFzLndpZHRoID0gX3dpZHRoO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmNhbnZhcy5oZWlnaHQgPSBfaGVpZ2h0O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXQgdGhlIGFyZWEgb24gdGhlIG9mZnNjcmVlbi1jYW52YXMgdG8gcmVuZGVyIHRoZSBjYW1lcmEgaW1hZ2UgdG8uXHJcbiAgICAgICAgICogQHBhcmFtIF9yZWN0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBzZXRWaWV3cG9ydFJlY3RhbmdsZShfcmVjdDogUmVjdGFuZ2xlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oUmVuZGVyT3BlcmF0b3IucmVjdFZpZXdwb3J0LCBfcmVjdCk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudmlld3BvcnQoX3JlY3QueCwgX3JlY3QueSwgX3JlY3Qud2lkdGgsIF9yZWN0LmhlaWdodCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBhcmVhIG9uIHRoZSBvZmZzY3JlZW4tY2FudmFzIHRoZSBjYW1lcmEgaW1hZ2UgZ2V0cyByZW5kZXJlZCB0by5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldFZpZXdwb3J0UmVjdGFuZ2xlKCk6IFJlY3RhbmdsZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBSZW5kZXJPcGVyYXRvci5yZWN0Vmlld3BvcnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb252ZXJ0IGxpZ2h0IGRhdGEgdG8gZmxhdCBhcnJheXNcclxuICAgICAgICAgKiBUT0RPOiB0aGlzIG1ldGhvZCBhcHBlYXJzIHRvIGJlIG9ic29sZXRlLi4uP1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgY3JlYXRlUmVuZGVyTGlnaHRzKF9saWdodHM6IE1hcExpZ2h0VHlwZVRvTGlnaHRMaXN0KTogUmVuZGVyTGlnaHRzIHtcclxuICAgICAgICAgICAgbGV0IHJlbmRlckxpZ2h0czogUmVuZGVyTGlnaHRzID0ge307XHJcbiAgICAgICAgICAgIGZvciAobGV0IGVudHJ5IG9mIF9saWdodHMpIHtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHNpbXBseWZ5LCBzaW5jZSBkaXJlY3Rpb24gaXMgbm93IGhhbmRsZWQgYnkgQ29tcG9uZW50TGlnaHRcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZW50cnlbMF0pIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIExpZ2h0QW1iaWVudDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFtYmllbnQ6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGNtcExpZ2h0IG9mIGVudHJ5WzFdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYzogQ29sb3IgPSBjbXBMaWdodC5saWdodC5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFtYmllbnQucHVzaChjLnIsIGMuZywgYy5iLCBjLmEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpZ2h0c1tcInVfYW1iaWVudFwiXSA9IG5ldyBGbG9hdDMyQXJyYXkoYW1iaWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTGlnaHREaXJlY3Rpb25hbDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbmFsOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjbXBMaWdodCBvZiBlbnRyeVsxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGM6IENvbG9yID0gY21wTGlnaHQubGlnaHQuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgZDogVmVjdG9yMyA9ICg8TGlnaHREaXJlY3Rpb25hbD5saWdodC5nZXRMaWdodCgpKS5kaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb25hbC5wdXNoKGMuciwgYy5nLCBjLmIsIGMuYSwgMCwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlnaHRzW1widV9kaXJlY3Rpb25hbFwiXSA9IG5ldyBGbG9hdDMyQXJyYXkoZGlyZWN0aW9uYWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBEZWJ1Zy53YXJuKFwiU2hhZGVyc3RydWN0dXJlIHVuZGVmaW5lZCBmb3JcIiwgZW50cnlbMF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJMaWdodHM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXQgbGlnaHQgZGF0YSBpbiBzaGFkZXJzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBzZXRMaWdodHNJblNoYWRlcihfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIsIF9saWdodHM6IE1hcExpZ2h0VHlwZVRvTGlnaHRMaXN0KTogdm9pZCB7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLnVzZVByb2dyYW0oX3JlbmRlclNoYWRlcik7XHJcbiAgICAgICAgICAgIGxldCB1bmk6IHsgW25hbWU6IHN0cmluZ106IFdlYkdMVW5pZm9ybUxvY2F0aW9uIH0gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zO1xyXG5cclxuICAgICAgICAgICAgbGV0IGFtYmllbnQ6IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gdW5pW1widV9hbWJpZW50LmNvbG9yXCJdO1xyXG4gICAgICAgICAgICBpZiAoYW1iaWVudCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNtcExpZ2h0czogQ29tcG9uZW50TGlnaHRbXSA9IF9saWdodHMuZ2V0KExpZ2h0QW1iaWVudCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY21wTGlnaHRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogYWRkIHVwIGFtYmllbnQgbGlnaHRzIHRvIGEgc2luZ2xlIGNvbG9yXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdDogQ29sb3IgPSBuZXcgQ29sb3IoMCwgMCwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY21wTGlnaHQgb2YgY21wTGlnaHRzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuYWRkKGNtcExpZ2h0LmxpZ2h0LmNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLnVuaWZvcm00ZnYoYW1iaWVudCwgcmVzdWx0LmdldEFycmF5KCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgbkRpcmVjdGlvbmFsOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IHVuaVtcInVfbkxpZ2h0c0RpcmVjdGlvbmFsXCJdO1xyXG4gICAgICAgICAgICBpZiAobkRpcmVjdGlvbmFsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY21wTGlnaHRzOiBDb21wb25lbnRMaWdodFtdID0gX2xpZ2h0cy5nZXQoTGlnaHREaXJlY3Rpb25hbCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY21wTGlnaHRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG46IG51bWJlciA9IGNtcExpZ2h0cy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtMXVpKG5EaXJlY3Rpb25hbCwgbik7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY21wTGlnaHQ6IENvbXBvbmVudExpZ2h0ID0gY21wTGlnaHRzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLnVuaWZvcm00ZnYodW5pW2B1X2RpcmVjdGlvbmFsWyR7aX1dLmNvbG9yYF0sIGNtcExpZ2h0LmxpZ2h0LmNvbG9yLmdldEFycmF5KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBWZWN0b3IzID0gVmVjdG9yMy5aKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbi50cmFuc2Zvcm0oY21wTGlnaHQucGl2b3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24udHJhbnNmb3JtKGNtcExpZ2h0LmdldENvbnRhaW5lcigpLm10eFdvcmxkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtM2Z2KHVuaVtgdV9kaXJlY3Rpb25hbFske2l9XS5kaXJlY3Rpb25gXSwgZGlyZWN0aW9uLmdldCgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZGVidWdnZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBEcmF3IGEgbWVzaCBidWZmZXIgdXNpbmcgdGhlIGdpdmVuIGluZm9zIGFuZCB0aGUgY29tcGxldGUgcHJvamVjdGlvbiBtYXRyaXhcclxuICAgICAgICAgKiBAcGFyYW0gX3JlbmRlclNoYWRlciBcclxuICAgICAgICAgKiBAcGFyYW0gX3JlbmRlckJ1ZmZlcnMgXHJcbiAgICAgICAgICogQHBhcmFtIF9yZW5kZXJDb2F0IFxyXG4gICAgICAgICAqIEBwYXJhbSBfd29ybGQgXHJcbiAgICAgICAgICogQHBhcmFtIF9wcm9qZWN0aW9uIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgZHJhdyhfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIsIF9yZW5kZXJCdWZmZXJzOiBSZW5kZXJCdWZmZXJzLCBfcmVuZGVyQ29hdDogUmVuZGVyQ29hdCwgX3dvcmxkOiBNYXRyaXg0eDQsIF9wcm9qZWN0aW9uOiBNYXRyaXg0eDQpOiB2b2lkIHtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IudXNlUHJvZ3JhbShfcmVuZGVyU2hhZGVyKTtcclxuICAgICAgICAgICAgLy8gUmVuZGVyT3BlcmF0b3IudXNlQnVmZmVycyhfcmVuZGVyQnVmZmVycyk7XHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLnVzZVBhcmFtZXRlcihfcmVuZGVyQ29hdCk7XHJcblxyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIF9yZW5kZXJCdWZmZXJzLnZlcnRpY2VzKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShfcmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX3Bvc2l0aW9uXCJdKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3Iuc2V0QXR0cmlidXRlU3RydWN0dXJlKF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfcG9zaXRpb25cIl0sIE1lc2guZ2V0QnVmZmVyU3BlY2lmaWNhdGlvbigpKTtcclxuXHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBfcmVuZGVyQnVmZmVycy5pbmRpY2VzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfcmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX3RleHR1cmVVVnNcIl0pIHtcclxuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMudGV4dHVyZVVWcyk7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfdGV4dHVyZVVWc1wiXSk7IC8vIGVuYWJsZSB0aGUgYnVmZmVyXHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLnZlcnRleEF0dHJpYlBvaW50ZXIoX3JlbmRlclNoYWRlci5hdHRyaWJ1dGVzW1wiYV90ZXh0dXJlVVZzXCJdLCAyLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkZMT0FULCBmYWxzZSwgMCwgMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gU3VwcGx5IG1hdHJpeGRhdGEgdG8gc2hhZGVyLiBcclxuICAgICAgICAgICAgbGV0IHVQcm9qZWN0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IF9yZW5kZXJTaGFkZXIudW5pZm9ybXNbXCJ1X3Byb2plY3Rpb25cIl07XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudW5pZm9ybU1hdHJpeDRmdih1UHJvamVjdGlvbiwgZmFsc2UsIF9wcm9qZWN0aW9uLmdldCgpKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV93b3JsZFwiXSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHVXb3JsZDogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV93b3JsZFwiXTtcclxuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudW5pZm9ybU1hdHJpeDRmdih1V29ybGQsIGZhbHNlLCBfd29ybGQuZ2V0KCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMubm9ybWFsc0ZhY2UpO1xyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShfcmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX25vcm1hbFwiXSk7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5zZXRBdHRyaWJ1dGVTdHJ1Y3R1cmUoX3JlbmRlclNoYWRlci5hdHRyaWJ1dGVzW1wiYV9ub3JtYWxcIl0sIE1lc2guZ2V0QnVmZmVyU3BlY2lmaWNhdGlvbigpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGFsbCB0aGF0J3MgbGVmdCBvZiBjb2F0IGhhbmRsaW5nIGluIFJlbmRlck9wZXJhdG9yLCBkdWUgdG8gaW5qZWN0aW9uLiBTbyBleHRyYSByZWZlcmVuY2UgZnJvbSBub2RlIHRvIGNvYXQgaXMgdW5uZWNlc3NhcnlcclxuICAgICAgICAgICAgX3JlbmRlckNvYXQuY29hdC51c2VSZW5kZXJEYXRhKF9yZW5kZXJTaGFkZXIpO1xyXG5cclxuICAgICAgICAgICAgLy8gRHJhdyBjYWxsXHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuZHJhd0VsZW1lbnRzKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVFJJQU5HTEVTLCBNZXNoLmdldEJ1ZmZlclNwZWNpZmljYXRpb24oKS5vZmZzZXQsIF9yZW5kZXJCdWZmZXJzLm5JbmRpY2VzKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5kcmF3RWxlbWVudHMoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5UUklBTkdMRVMsIF9yZW5kZXJCdWZmZXJzLm5JbmRpY2VzLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlVOU0lHTkVEX1NIT1JULCAwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERyYXcgYSBidWZmZXIgd2l0aCBhIHNwZWNpYWwgc2hhZGVyIHRoYXQgdXNlcyBhbiBpZCBpbnN0ZWFkIG9mIGEgY29sb3JcclxuICAgICAgICAgKiBAcGFyYW0gX3JlbmRlclNoYWRlclxyXG4gICAgICAgICAqIEBwYXJhbSBfcmVuZGVyQnVmZmVycyBcclxuICAgICAgICAgKiBAcGFyYW0gX3dvcmxkIFxyXG4gICAgICAgICAqIEBwYXJhbSBfcHJvamVjdGlvbiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGRyYXdGb3JSYXlDYXN0KF9pZDogbnVtYmVyLCBfcmVuZGVyQnVmZmVyczogUmVuZGVyQnVmZmVycywgX3dvcmxkOiBNYXRyaXg0eDQsIF9wcm9qZWN0aW9uOiBNYXRyaXg0eDQpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IHJlbmRlclNoYWRlcjogUmVuZGVyU2hhZGVyID0gUmVuZGVyT3BlcmF0b3IucmVuZGVyU2hhZGVyUmF5Q2FzdDtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IudXNlUHJvZ3JhbShyZW5kZXJTaGFkZXIpO1xyXG5cclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBfcmVuZGVyQnVmZmVycy52ZXJ0aWNlcyk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX3Bvc2l0aW9uXCJdKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3Iuc2V0QXR0cmlidXRlU3RydWN0dXJlKHJlbmRlclNoYWRlci5hdHRyaWJ1dGVzW1wiYV9wb3NpdGlvblwiXSwgTWVzaC5nZXRCdWZmZXJTcGVjaWZpY2F0aW9uKCkpO1xyXG5cclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIF9yZW5kZXJCdWZmZXJzLmluZGljZXMpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3VwcGx5IG1hdHJpeGRhdGEgdG8gc2hhZGVyLiBcclxuICAgICAgICAgICAgbGV0IHVQcm9qZWN0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IHJlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfcHJvamVjdGlvblwiXTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtTWF0cml4NGZ2KHVQcm9qZWN0aW9uLCBmYWxzZSwgX3Byb2plY3Rpb24uZ2V0KCkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfd29ybGRcIl0pIHtcclxuICAgICAgICAgICAgICAgIGxldCB1V29ybGQ6IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV93b3JsZFwiXTtcclxuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudW5pZm9ybU1hdHJpeDRmdih1V29ybGQsIGZhbHNlLCBfd29ybGQuZ2V0KCkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgaWRVbmlmb3JtTG9jYXRpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV9pZFwiXTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuZ2V0UmVuZGVyaW5nQ29udGV4dCgpLnVuaWZvcm0xaShpZFVuaWZvcm1Mb2NhdGlvbiwgX2lkKTtcclxuXHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZHJhd0VsZW1lbnRzKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVFJJQU5HTEVTLCBfcmVuZGVyQnVmZmVycy5uSW5kaWNlcywgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5VTlNJR05FRF9TSE9SVCwgMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAjcmVnaW9uIFNoYWRlcnByb2dyYW0gXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBjcmVhdGVQcm9ncmFtKF9zaGFkZXJDbGFzczogdHlwZW9mIFNoYWRlcik6IFJlbmRlclNoYWRlciB7XHJcbiAgICAgICAgICAgIGxldCBjcmMzOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0ID0gUmVuZGVyT3BlcmF0b3IuY3JjMztcclxuICAgICAgICAgICAgbGV0IHByb2dyYW06IFdlYkdMUHJvZ3JhbSA9IGNyYzMuY3JlYXRlUHJvZ3JhbSgpO1xyXG4gICAgICAgICAgICBsZXQgcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXI7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjcmMzLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBSZW5kZXJPcGVyYXRvci5hc3NlcnQ8V2ViR0xTaGFkZXI+KGNvbXBpbGVTaGFkZXIoX3NoYWRlckNsYXNzLmdldFZlcnRleFNoYWRlclNvdXJjZSgpLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlZFUlRFWF9TSEFERVIpKSk7XHJcbiAgICAgICAgICAgICAgICBjcmMzLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBSZW5kZXJPcGVyYXRvci5hc3NlcnQ8V2ViR0xTaGFkZXI+KGNvbXBpbGVTaGFkZXIoX3NoYWRlckNsYXNzLmdldEZyYWdtZW50U2hhZGVyU291cmNlKCksIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRlJBR01FTlRfU0hBREVSKSkpO1xyXG4gICAgICAgICAgICAgICAgY3JjMy5saW5rUHJvZ3JhbShwcm9ncmFtKTtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcjogc3RyaW5nID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PHN0cmluZz4oY3JjMy5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBsaW5raW5nIFNoYWRlcjogXCIgKyBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZW5kZXJTaGFkZXIgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogcHJvZ3JhbSxcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiBkZXRlY3RBdHRyaWJ1dGVzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgdW5pZm9ybXM6IGRldGVjdFVuaWZvcm1zKClcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKF9lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoX2Vycm9yKTtcclxuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJTaGFkZXI7XHJcblxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY29tcGlsZVNoYWRlcihfc2hhZGVyQ29kZTogc3RyaW5nLCBfc2hhZGVyVHlwZTogR0xlbnVtKTogV2ViR0xTaGFkZXIgfCBudWxsIHtcclxuICAgICAgICAgICAgICAgIGxldCB3ZWJHTFNoYWRlcjogV2ViR0xTaGFkZXIgPSBjcmMzLmNyZWF0ZVNoYWRlcihfc2hhZGVyVHlwZSk7XHJcbiAgICAgICAgICAgICAgICBjcmMzLnNoYWRlclNvdXJjZSh3ZWJHTFNoYWRlciwgX3NoYWRlckNvZGUpO1xyXG4gICAgICAgICAgICAgICAgY3JjMy5jb21waWxlU2hhZGVyKHdlYkdMU2hhZGVyKTtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcjogc3RyaW5nID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PHN0cmluZz4oY3JjMy5nZXRTaGFkZXJJbmZvTG9nKHdlYkdMU2hhZGVyKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBjb21waWxpbmcgc2hhZGVyOiBcIiArIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBhbnkgY29tcGlsYXRpb24gZXJyb3JzLlxyXG4gICAgICAgICAgICAgICAgaWYgKCFjcmMzLmdldFNoYWRlclBhcmFtZXRlcih3ZWJHTFNoYWRlciwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5DT01QSUxFX1NUQVRVUykpIHtcclxuICAgICAgICAgICAgICAgICAgICBhbGVydChjcmMzLmdldFNoYWRlckluZm9Mb2cod2ViR0xTaGFkZXIpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB3ZWJHTFNoYWRlcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmdW5jdGlvbiBkZXRlY3RBdHRyaWJ1dGVzKCk6IHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9IHtcclxuICAgICAgICAgICAgICAgIGxldCBkZXRlY3RlZEF0dHJpYnV0ZXM6IHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9ID0ge307XHJcbiAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlQ291bnQ6IG51bWJlciA9IGNyYzMuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFDVElWRV9BVFRSSUJVVEVTKTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBhdHRyaWJ1dGVDb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZUluZm86IFdlYkdMQWN0aXZlSW5mbyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEFjdGl2ZUluZm8+KGNyYzMuZ2V0QWN0aXZlQXR0cmliKHByb2dyYW0sIGkpKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWF0dHJpYnV0ZUluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGRldGVjdGVkQXR0cmlidXRlc1thdHRyaWJ1dGVJbmZvLm5hbWVdID0gY3JjMy5nZXRBdHRyaWJMb2NhdGlvbihwcm9ncmFtLCBhdHRyaWJ1dGVJbmZvLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRldGVjdGVkQXR0cmlidXRlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmdW5jdGlvbiBkZXRlY3RVbmlmb3JtcygpOiB7IFtuYW1lOiBzdHJpbmddOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB9IHtcclxuICAgICAgICAgICAgICAgIGxldCBkZXRlY3RlZFVuaWZvcm1zOiB7IFtuYW1lOiBzdHJpbmddOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB9ID0ge307XHJcbiAgICAgICAgICAgICAgICBsZXQgdW5pZm9ybUNvdW50OiBudW1iZXIgPSBjcmMzLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BQ1RJVkVfVU5JRk9STVMpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHVuaWZvcm1Db3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZm86IFdlYkdMQWN0aXZlSW5mbyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEFjdGl2ZUluZm8+KGNyYzMuZ2V0QWN0aXZlVW5pZm9ybShwcm9ncmFtLCBpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBkZXRlY3RlZFVuaWZvcm1zW2luZm8ubmFtZV0gPSBSZW5kZXJPcGVyYXRvci5hc3NlcnQ8V2ViR0xVbmlmb3JtTG9jYXRpb24+KGNyYzMuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dyYW0sIGluZm8ubmFtZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRldGVjdGVkVW5pZm9ybXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyB1c2VQcm9ncmFtKF9zaGFkZXJJbmZvOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51c2VQcm9ncmFtKF9zaGFkZXJJbmZvLnByb2dyYW0pO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KF9zaGFkZXJJbmZvLmF0dHJpYnV0ZXNbXCJhX3Bvc2l0aW9uXCJdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBkZWxldGVQcm9ncmFtKF9wcm9ncmFtOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKF9wcm9ncmFtKSB7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmRlbGV0ZVByb2dyYW0oX3Byb2dyYW0ucHJvZ3JhbSk7XHJcbiAgICAgICAgICAgICAgICBkZWxldGUgX3Byb2dyYW0uYXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBfcHJvZ3JhbS51bmlmb3JtcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAjZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vICNyZWdpb24gTWVzaGJ1ZmZlclxyXG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgY3JlYXRlQnVmZmVycyhfbWVzaDogTWVzaCk6IFJlbmRlckJ1ZmZlcnMge1xyXG4gICAgICAgICAgICBsZXQgdmVydGljZXM6IFdlYkdMQnVmZmVyID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PFdlYkdMQnVmZmVyPihSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZUJ1ZmZlcigpKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCB2ZXJ0aWNlcyk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYnVmZmVyRGF0YShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX21lc2gudmVydGljZXMsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuU1RBVElDX0RSQVcpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGluZGljZXM6IFdlYkdMQnVmZmVyID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PFdlYkdMQnVmZmVyPihSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZUJ1ZmZlcigpKTtcclxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIGluZGljZXMpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJ1ZmZlckRhdGEoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgX21lc2guaW5kaWNlcywgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5TVEFUSUNfRFJBVyk7XHJcblxyXG4gICAgICAgICAgICBsZXQgdGV4dHVyZVVWczogV2ViR0xCdWZmZXIgPSBSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIHRleHR1cmVVVnMpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJ1ZmZlckRhdGEoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIF9tZXNoLnRleHR1cmVVVnMsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuU1RBVElDX0RSQVcpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5vcm1hbHNGYWNlOiBXZWJHTEJ1ZmZlciA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEJ1ZmZlcj4oUmVuZGVyT3BlcmF0b3IuY3JjMy5jcmVhdGVCdWZmZXIoKSk7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgbm9ybWFsc0ZhY2UpO1xyXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJ1ZmZlckRhdGEoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIF9tZXNoLm5vcm1hbHNGYWNlLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlNUQVRJQ19EUkFXKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmZvOiBSZW5kZXJCdWZmZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgdmVydGljZXM6IHZlcnRpY2VzLFxyXG4gICAgICAgICAgICAgICAgaW5kaWNlczogaW5kaWNlcyxcclxuICAgICAgICAgICAgICAgIG5JbmRpY2VzOiBfbWVzaC5nZXRJbmRleENvdW50KCksXHJcbiAgICAgICAgICAgICAgICB0ZXh0dXJlVVZzOiB0ZXh0dXJlVVZzLFxyXG4gICAgICAgICAgICAgICAgbm9ybWFsc0ZhY2U6IG5vcm1hbHNGYWNlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBidWZmZXJJbmZvO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIHVzZUJ1ZmZlcnMoX3JlbmRlckJ1ZmZlcnM6IFJlbmRlckJ1ZmZlcnMpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogY3VycmVudGx5IHVudXNlZCwgZG9uZSBzcGVjaWZpY2FsbHkgaW4gZHJhdy4gQ291bGQgYmUgc2F2ZWQgaW4gVkFPIHdpdGhpbiBSZW5kZXJCdWZmZXJzXHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMudmVydGljZXMpO1xyXG4gICAgICAgICAgICAvLyBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMuaW5kaWNlcyk7XHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMudGV4dHVyZVVWcyk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGRlbGV0ZUJ1ZmZlcnMoX3JlbmRlckJ1ZmZlcnM6IFJlbmRlckJ1ZmZlcnMpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKF9yZW5kZXJCdWZmZXJzKSB7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5kZWxldGVCdWZmZXIoX3JlbmRlckJ1ZmZlcnMudmVydGljZXMpO1xyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5kZWxldGVCdWZmZXIoX3JlbmRlckJ1ZmZlcnMudGV4dHVyZVVWcyk7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmRlbGV0ZUJ1ZmZlcihfcmVuZGVyQnVmZmVycy5pbmRpY2VzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAjZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vICNyZWdpb24gTWF0ZXJpYWxQYXJhbWV0ZXJzXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBjcmVhdGVQYXJhbWV0ZXIoX2NvYXQ6IENvYXQpOiBSZW5kZXJDb2F0IHtcclxuICAgICAgICAgICAgLy8gbGV0IHZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTFZlcnRleEFycmF5T2JqZWN0PihSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZVZlcnRleEFycmF5KCkpO1xyXG4gICAgICAgICAgICBsZXQgY29hdEluZm86IFJlbmRlckNvYXQgPSB7XHJcbiAgICAgICAgICAgICAgICAvL3ZhbzogbnVsbCxcclxuICAgICAgICAgICAgICAgIGNvYXQ6IF9jb2F0XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBjb2F0SW5mbztcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyB1c2VQYXJhbWV0ZXIoX2NvYXRJbmZvOiBSZW5kZXJDb2F0KTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZFZlcnRleEFycmF5KF9jb2F0SW5mby52YW8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGRlbGV0ZVBhcmFtZXRlcihfY29hdEluZm86IFJlbmRlckNvYXQpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKF9jb2F0SW5mbykge1xyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kVmVydGV4QXJyYXkobnVsbCk7XHJcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXJPcGVyYXRvci5jcmMzLmRlbGV0ZVZlcnRleEFycmF5KF9jb2F0SW5mby52YW8pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vICNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLyoqIFxyXG4gICAgICAgICAqIFdyYXBwZXIgZnVuY3Rpb24gdG8gdXRpbGl6ZSB0aGUgYnVmZmVyU3BlY2lmaWNhdGlvbiBpbnRlcmZhY2Ugd2hlbiBwYXNzaW5nIGRhdGEgdG8gdGhlIHNoYWRlciB2aWEgYSBidWZmZXIuXHJcbiAgICAgICAgICogQHBhcmFtIF9hdHRyaWJ1dGVMb2NhdGlvbiAvLyBUaGUgbG9jYXRpb24gb2YgdGhlIGF0dHJpYnV0ZSBvbiB0aGUgc2hhZGVyLCB0byB3aGljaCB0aGV5IGRhdGEgd2lsbCBiZSBwYXNzZWQuXHJcbiAgICAgICAgICogQHBhcmFtIF9idWZmZXJTcGVjaWZpY2F0aW9uIC8vIEludGVyZmFjZSBwYXNzaW5nIGRhdGFwdWxsc3BlY2lmaWNhdGlvbnMgdG8gdGhlIGJ1ZmZlci5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBzZXRBdHRyaWJ1dGVTdHJ1Y3R1cmUoX2F0dHJpYnV0ZUxvY2F0aW9uOiBudW1iZXIsIF9idWZmZXJTcGVjaWZpY2F0aW9uOiBCdWZmZXJTcGVjaWZpY2F0aW9uKTogdm9pZCB7XHJcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudmVydGV4QXR0cmliUG9pbnRlcihfYXR0cmlidXRlTG9jYXRpb24sIF9idWZmZXJTcGVjaWZpY2F0aW9uLnNpemUsIF9idWZmZXJTcGVjaWZpY2F0aW9uLmRhdGFUeXBlLCBfYnVmZmVyU3BlY2lmaWNhdGlvbi5ub3JtYWxpemUsIF9idWZmZXJTcGVjaWZpY2F0aW9uLnN0cmlkZSwgX2J1ZmZlclNwZWNpZmljYXRpb24ub2Zmc2V0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvTXV0YWJsZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1JlbmRlci9SZW5kZXJJbmplY3Rvci50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1JlbmRlci9SZW5kZXJPcGVyYXRvci50c1wiLz5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEhvbGRzIGRhdGEgdG8gZmVlZCBpbnRvIGEgW1tTaGFkZXJdXSB0byBkZXNjcmliZSB0aGUgc3VyZmFjZSBvZiBbW01lc2hdXS4gIFxyXG4gICAgICogW1tNYXRlcmlhbF1dcyByZWZlcmVuY2UgW1tDb2F0XV0gYW5kIFtbU2hhZGVyXV0uICAgXHJcbiAgICAgKiBUaGUgbWV0aG9kIHVzZVJlbmRlckRhdGEgd2lsbCBiZSBpbmplY3RlZCBieSBbW1JlbmRlckluamVjdG9yXV0gYXQgcnVudGltZSwgZXh0ZW5kaW5nIHRoZSBmdW5jdGlvbmFsaXR5IG9mIHRoaXMgY2xhc3MgdG8gZGVhbCB3aXRoIHRoZSByZW5kZXJlci5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvYXQgZXh0ZW5kcyBNdXRhYmxlIGltcGxlbWVudHMgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBwdWJsaWMgbmFtZTogc3RyaW5nID0gXCJDb2F0XCI7XHJcbiAgICAgICAgcHJvdGVjdGVkIHJlbmRlckRhdGE6IHtba2V5OiBzdHJpbmddOiB1bmtub3dufTtcclxuXHJcbiAgICAgICAgcHVibGljIG11dGF0ZShfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5tdXRhdGUoX211dGF0b3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVzZVJlbmRlckRhdGEoX3JlbmRlclNoYWRlcjogUmVuZGVyU2hhZGVyKTogdm9pZCB7LyogaW5qZWN0ZWQgYnkgUmVuZGVySW5qZWN0b3IqLyB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8jcmVnaW9uIFRyYW5zZmVyXHJcbiAgICAgICAgcHVibGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB0aGlzLmdldE11dGF0b3IoKTsgXHJcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICAgICAgICB0aGlzLm11dGF0ZShfc2VyaWFsaXphdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoKTogdm9pZCB7IC8qKi8gfVxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHNpbXBsZXN0IFtbQ29hdF1dIHByb3ZpZGluZyBqdXN0IGEgY29sb3JcclxuICAgICAqL1xyXG4gICAgQFJlbmRlckluamVjdG9yLmRlY29yYXRlQ29hdFxyXG4gICAgZXhwb3J0IGNsYXNzIENvYXRDb2xvcmVkIGV4dGVuZHMgQ29hdCB7XHJcbiAgICAgICAgcHVibGljIGNvbG9yOiBDb2xvcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2NvbG9yPzogQ29sb3IpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xvciA9IF9jb2xvciB8fCBuZXcgQ29sb3IoMC41LCAwLjUsIDAuNSwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQSBbW0NvYXRdXSB0byBiZSB1c2VkIGJ5IHRoZSBNYXRDYXAgU2hhZGVyIHByb3ZpZGluZyBhIHRleHR1cmUsIGEgdGludCBjb2xvciAoMC41IGdyZXkgaXMgbmV1dHJhbClcclxuICAgICAqIGFuZCBhIGZsYXRNaXggbnVtYmVyIGZvciBtaXhpbmcgYmV0d2VlbiBzbW9vdGggYW5kIGZsYXQgc2hhZGluZy5cclxuICAgICAqL1xyXG4gICAgQFJlbmRlckluamVjdG9yLmRlY29yYXRlQ29hdFxyXG4gICAgZXhwb3J0IGNsYXNzIENvYXRNYXRDYXAgZXh0ZW5kcyBDb2F0IHtcclxuICAgICAgICBwdWJsaWMgdGV4dHVyZTogVGV4dHVyZUltYWdlID0gbnVsbDtcclxuICAgICAgICBwdWJsaWMgdGludENvbG9yOiBDb2xvciA9IG5ldyBDb2xvcigwLjUsIDAuNSwgMC41LCAxKTtcclxuICAgICAgICBwdWJsaWMgZmxhdE1peDogbnVtYmVyID0gMC41O1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfdGV4dHVyZT86IFRleHR1cmVJbWFnZSwgX3RpbnRjb2xvcj86IENvbG9yLCBfZmxhdG1peD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgICAgICB0aGlzLnRleHR1cmUgPSBfdGV4dHVyZSB8fCBuZXcgVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIHRoaXMudGludENvbG9yID0gX3RpbnRjb2xvciB8fCBuZXcgQ29sb3IoMC41LCAwLjUsIDAuNSwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMuZmxhdE1peCA9IF9mbGF0bWl4ID4gMS4wID8gdGhpcy5mbGF0TWl4ID0gMS4wIDogdGhpcy5mbGF0TWl4ID0gX2ZsYXRtaXggfHwgMC41O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gIC8qKlxyXG4gICAqIEEgW1tDb2F0XV0gcHJvdmlkaW5nIGEgdGV4dHVyZSBhbmQgYWRkaXRpb25hbCBkYXRhIGZvciB0ZXh0dXJpbmdcclxuICAgKi9cclxuICBAUmVuZGVySW5qZWN0b3IuZGVjb3JhdGVDb2F0XHJcbiAgZXhwb3J0IGNsYXNzIENvYXRUZXh0dXJlZCBleHRlbmRzIENvYXQge1xyXG4gICAgcHVibGljIHRleHR1cmU6IFRleHR1cmVJbWFnZSA9IG51bGw7XHJcbiAgICBwdWJsaWMgcGl2b3Q6IE1hdHJpeDN4MyA9IE1hdHJpeDN4My5JREVOVElUWTtcclxuICAgIC8vIGp1c3QgaWRlYXMgc28gZmFyXHJcbiAgICBwdWJsaWMgdGlsaW5nWDogbnVtYmVyO1xyXG4gICAgcHVibGljIHRpbGluZ1k6IG51bWJlcjtcclxuICAgIHB1YmxpYyByZXBldGl0aW9uOiBib29sZWFuO1xyXG5cclxuICAgIC8vIHB1YmxpYyBnZXRNdXRhdG9yRm9yQ29tcG9uZW50KCk6IE11dGF0b3JGb3JDb21wb25lbnQge1xyXG4gICAgLy8gICBsZXQgbXV0YXRvclBpdm90OiBNdXRhdG9yRm9yQ29tcG9uZW50ID0gPE11dGF0b3JGb3JDb21wb25lbnQ+PHVua25vd24+dGhpcy5waXZvdC5nZXRNdXRhdG9yKCk7XHJcbiAgICAvLyAgIHJldHVybiBtdXRhdG9yUGl2b3Q7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgLy8gcHVibGljIG11dGF0ZShfbXV0YXRvcjogTXV0YXRvckZvckNvbXBvbmVudCk6IHZvaWQge1xyXG4gICAgLy8gICB0aGlzLnBpdm90Lm11dGF0ZShfbXV0YXRvcik7XHJcbiAgICAvLyB9XHJcbiAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHNcIi8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9NdXRhYmxlLnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIC8qKiBcclxuICAgICAqIFN1cGVyY2xhc3MgZm9yIGFsbCBbW0NvbXBvbmVudF1dcyB0aGF0IGNhbiBiZSBhdHRhY2hlZCB0byBbW05vZGVdXXMuXHJcbiAgICAgKiBAYXV0aG9ycyBKYXNjaGEgS2FyYWfDtmwsIEhGVSwgMjAxOSB8IEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDE5XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21wb25lbnQgZXh0ZW5kcyBNdXRhYmxlIGltcGxlbWVudHMgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBwcm90ZWN0ZWQgc2luZ2xldG9uOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBwcml2YXRlIGNvbnRhaW5lcjogTm9kZSB8IG51bGwgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgYWN0aXZlOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgcHVibGljIGFjdGl2YXRlKF9vbjogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2ZSA9IF9vbjtcclxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChfb24gPyBFVkVOVC5DT01QT05FTlRfQUNUSVZBVEUgOiBFVkVOVC5DT01QT05FTlRfREVBQ1RJVkFURSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZ2V0IGlzQWN0aXZlKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hY3RpdmU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBJcyB0cnVlLCB3aGVuIG9ubHkgb25lIGluc3RhbmNlIG9mIHRoZSBjb21wb25lbnQgY2xhc3MgY2FuIGJlIGF0dGFjaGVkIHRvIGEgbm9kZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBnZXQgaXNTaW5nbGV0b24oKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNpbmdsZXRvbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmVzIHRoZSBub2RlLCB0aGlzIGNvbXBvbmVudCBpcyBjdXJyZW50bHkgYXR0YWNoZWQgdG9cclxuICAgICAgICAgKiBAcmV0dXJucyBUaGUgY29udGFpbmVyIG5vZGUgb3IgbnVsbCwgaWYgdGhlIGNvbXBvbmVudCBpcyBub3QgYXR0YWNoZWQgdG9cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0Q29udGFpbmVyKCk6IE5vZGUgfCBudWxsIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGFpbmVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBUcmllcyB0byBhZGQgdGhlIGNvbXBvbmVudCB0byB0aGUgZ2l2ZW4gbm9kZSwgcmVtb3ZpbmcgaXQgZnJvbSB0aGUgcHJldmlvdXMgY29udGFpbmVyIGlmIGFwcGxpY2FibGVcclxuICAgICAgICAgKiBAcGFyYW0gX2NvbnRhaW5lciBUaGUgbm9kZSB0byBhdHRhY2ggdGhpcyBjb21wb25lbnQgdG9cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0Q29udGFpbmVyKF9jb250YWluZXI6IE5vZGUgfCBudWxsKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnRhaW5lciA9PSBfY29udGFpbmVyKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICBsZXQgcHJldmlvdXNDb250YWluZXI6IE5vZGUgPSB0aGlzLmNvbnRhaW5lcjtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0NvbnRhaW5lcilcclxuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0NvbnRhaW5lci5yZW1vdmVDb21wb25lbnQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lciA9IF9jb250YWluZXI7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb250YWluZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250YWluZXIuYWRkQ29tcG9uZW50KHRoaXMpO1xyXG4gICAgICAgICAgICB9IGNhdGNoKF9lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb250YWluZXIgPSBwcmV2aW91c0NvbnRhaW5lcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNyZWdpb24gVHJhbnNmZXJcclxuICAgICAgICBwdWJsaWMgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xyXG4gICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgIGFjdGl2ZTogdGhpcy5hY3RpdmVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gX3NlcmlhbGl6YXRpb24uYWN0aXZlO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCByZWR1Y2VNdXRhdG9yKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBfbXV0YXRvci5zaW5nbGV0b247XHJcbiAgICAgICAgICAgIGRlbGV0ZSBfbXV0YXRvci5jb250YWluZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvbXBvbmVudC50c1wiLz5cclxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgLyoqXHJcbiAgICogSG9sZHMgZGlmZmVyZW50IHBsYXltb2RlcyB0aGUgYW5pbWF0aW9uIHVzZXMgdG8gcGxheSBiYWNrIGl0cyBhbmltYXRpb24uXHJcbiAgICogQGF1dGhvciBMdWthcyBTY2hldWVybGUsIEhGVSwgMjAxOVxyXG4gICAqL1xyXG4gIGV4cG9ydCBlbnVtIEFOSU1BVElPTl9QTEFZTU9ERSB7XHJcbiAgICAvKipQbGF5cyBhbmltYXRpb24gaW4gYSBsb29wOiBpdCByZXN0YXJ0cyBvbmNlIGl0IGhpdCB0aGUgZW5kLiovXHJcbiAgICBMT09QLFxyXG4gICAgLyoqUGxheXMgYW5pbWF0aW9uIG9uY2UgYW5kIHN0b3BzIGF0IHRoZSBsYXN0IGtleS9mcmFtZSovXHJcbiAgICBQTEFZT05DRSxcclxuICAgIC8qKlBsYXlzIGFuaW1hdGlvbiBvbmNlIGFuZCBzdG9wcyBvbiB0aGUgZmlyc3Qga2V5L2ZyYW1lICovXHJcbiAgICBQTEFZT05DRVNUT1BBRlRFUixcclxuICAgIC8qKlBsYXlzIGFuaW1hdGlvbiBsaWtlIExPT1AsIGJ1dCBiYWNrd2FyZHMuKi9cclxuICAgIFJFVkVSU0VMT09QLFxyXG4gICAgLyoqQ2F1c2VzIHRoZSBhbmltYXRpb24gbm90IHRvIHBsYXkgYXQgYWxsLiBVc2VmdWwgZm9yIGp1bXBpbmcgdG8gdmFyaW91cyBwb3NpdGlvbnMgaW4gdGhlIGFuaW1hdGlvbiB3aXRob3V0IHByb2NlZWRpbmcgaW4gdGhlIGFuaW1hdGlvbi4qL1xyXG4gICAgU1RPUFxyXG4gICAgLy9UT0RPOiBhZGQgYW4gSU5IRVJJVCBhbmQgYSBQSU5HUE9ORyBtb2RlXHJcbiAgfVxyXG5cclxuICBleHBvcnQgZW51bSBBTklNQVRJT05fUExBWUJBQ0sge1xyXG4gICAgLy9UT0RPOiBhZGQgYW4gaW4tZGVwdGggZGVzY3JpcHRpb24gb2Ygd2hhdCBoYXBwZW5zIHRvIHRoZSBhbmltYXRpb24gKGFuZCBldmVudHMpIGRlcGVuZGluZyBvbiB0aGUgUGxheWJhY2suIFVzZSBHcmFwaHMgdG8gZXhwbGFpbi5cclxuICAgIC8qKkNhbGN1bGF0ZXMgdGhlIHN0YXRlIG9mIHRoZSBhbmltYXRpb24gYXQgdGhlIGV4YWN0IHBvc2l0aW9uIG9mIHRpbWUuIElnbm9yZXMgRlBTIHZhbHVlIG9mIGFuaW1hdGlvbi4qL1xyXG4gICAgVElNRUJBU0VEX0NPTlRJTk9VUyxcclxuICAgIC8qKkxpbWl0cyB0aGUgY2FsY3VsYXRpb24gb2YgdGhlIHN0YXRlIG9mIHRoZSBhbmltYXRpb24gdG8gdGhlIEZQUyB2YWx1ZSBvZiB0aGUgYW5pbWF0aW9uLiBTa2lwcyBmcmFtZXMgaWYgbmVlZGVkLiovXHJcbiAgICBUSU1FQkFTRURfUkFTVEVSRURfVE9fRlBTLFxyXG4gICAgLyoqVXNlcyB0aGUgRlBTIHZhbHVlIG9mIHRoZSBhbmltYXRpb24gdG8gYWR2YW5jZSBvbmNlIHBlciBmcmFtZSwgbm8gbWF0dGVyIHRoZSBzcGVlZCBvZiB0aGUgZnJhbWVzLiBEb2Vzbid0IHNraXAgYW55IGZyYW1lcy4qL1xyXG4gICAgRlJBTUVCQVNFRFxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSG9sZHMgYSByZWZlcmVuY2UgdG8gYW4gW1tBbmltYXRpb25dXSBhbmQgY29udHJvbHMgaXQuIENvbnRyb2xzIHBsYXliYWNrIGFuZCBwbGF5bW9kZSBhcyB3ZWxsIGFzIHNwZWVkLlxyXG4gICAqIEBhdXRob3JzIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XHJcbiAgICovXHJcbiAgZXhwb3J0IGNsYXNzIENvbXBvbmVudEFuaW1hdG9yIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuICAgIC8vVE9ETzogYWRkIGZ1bmN0aW9uYWxpdHkgdG8gYmxlbmQgZnJvbSBvbmUgYW5pbWF0aW9uIHRvIGFub3RoZXIuXHJcbiAgICBhbmltYXRpb246IEFuaW1hdGlvbjtcclxuICAgIHBsYXltb2RlOiBBTklNQVRJT05fUExBWU1PREU7XHJcbiAgICBwbGF5YmFjazogQU5JTUFUSU9OX1BMQVlCQUNLO1xyXG4gICAgc3BlZWRTY2FsZXNXaXRoR2xvYmFsU3BlZWQ6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgIHByaXZhdGUgbG9jYWxUaW1lOiBUaW1lO1xyXG4gICAgcHJpdmF0ZSBzcGVlZFNjYWxlOiBudW1iZXIgPSAxO1xyXG4gICAgcHJpdmF0ZSBsYXN0VGltZTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihfYW5pbWF0aW9uOiBBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uKFwiXCIpLCBfcGxheW1vZGU6IEFOSU1BVElPTl9QTEFZTU9ERSA9IEFOSU1BVElPTl9QTEFZTU9ERS5MT09QLCBfcGxheWJhY2s6IEFOSU1BVElPTl9QTEFZQkFDSyA9IEFOSU1BVElPTl9QTEFZQkFDSy5USU1FQkFTRURfQ09OVElOT1VTKSB7XHJcbiAgICAgIHN1cGVyKCk7XHJcbiAgICAgIHRoaXMuYW5pbWF0aW9uID0gX2FuaW1hdGlvbjtcclxuICAgICAgdGhpcy5wbGF5bW9kZSA9IF9wbGF5bW9kZTtcclxuICAgICAgdGhpcy5wbGF5YmFjayA9IF9wbGF5YmFjaztcclxuXHJcbiAgICAgIHRoaXMubG9jYWxUaW1lID0gbmV3IFRpbWUoKTtcclxuXHJcbiAgICAgIC8vVE9ETzogdXBkYXRlIGFuaW1hdGlvbiB0b3RhbCB0aW1lIHdoZW4gbG9hZGluZyBhIGRpZmZlcmVudCBhbmltYXRpb24/XHJcbiAgICAgIHRoaXMuYW5pbWF0aW9uLmNhbGN1bGF0ZVRvdGFsVGltZSgpO1xyXG5cclxuICAgICAgTG9vcC5hZGRFdmVudExpc3RlbmVyKEVWRU5ULkxPT1BfRlJBTUUsIHRoaXMudXBkYXRlQW5pbWF0aW9uTG9vcC5iaW5kKHRoaXMpKTtcclxuICAgICAgVGltZS5nYW1lLmFkZEV2ZW50TGlzdGVuZXIoRVZFTlQuVElNRV9TQ0FMRUQsIHRoaXMudXBkYXRlU2NhbGUuYmluZCh0aGlzKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IHNwZWVkKF9zOiBudW1iZXIpIHtcclxuICAgICAgdGhpcy5zcGVlZFNjYWxlID0gX3M7XHJcbiAgICAgIHRoaXMudXBkYXRlU2NhbGUoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEp1bXBzIHRvIGEgY2VydGFpbiB0aW1lIGluIHRoZSBhbmltYXRpb24gdG8gcGxheSBmcm9tIHRoZXJlLlxyXG4gICAgICogQHBhcmFtIF90aW1lIFRoZSB0aW1lIHRvIGp1bXAgdG9cclxuICAgICAqL1xyXG4gICAganVtcFRvKF90aW1lOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgdGhpcy5sb2NhbFRpbWUuc2V0KF90aW1lKTtcclxuICAgICAgdGhpcy5sYXN0VGltZSA9IF90aW1lO1xyXG4gICAgICBfdGltZSA9IF90aW1lICUgdGhpcy5hbmltYXRpb24udG90YWxUaW1lO1xyXG4gICAgICBsZXQgbXV0YXRvcjogTXV0YXRvciA9IHRoaXMuYW5pbWF0aW9uLmdldE11dGF0ZWQoX3RpbWUsIHRoaXMuY2FsY3VsYXRlRGlyZWN0aW9uKF90aW1lKSwgdGhpcy5wbGF5YmFjayk7XHJcbiAgICAgIHRoaXMuZ2V0Q29udGFpbmVyKCkuYXBwbHlBbmltYXRpb24obXV0YXRvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IHRpbWUgb2YgdGhlIGFuaW1hdGlvbiwgbW9kdWxhdGVkIGZvciBhbmltYXRpb24gbGVuZ3RoLlxyXG4gICAgICovXHJcbiAgICBnZXRDdXJyZW50VGltZSgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy5sb2NhbFRpbWUuZ2V0KCkgJSB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGb3JjZXMgYW4gdXBkYXRlIG9mIHRoZSBhbmltYXRpb24gZnJvbSBvdXRzaWRlLiBVc2VkIGluIHRoZSBWaWV3QW5pbWF0aW9uLiBTaG91bGRuJ3QgYmUgdXNlZCBkdXJpbmcgdGhlIGdhbWUuXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgdGhlICh1bnNjYWxlZCkgdGltZSB0byB1cGRhdGUgdGhlIGFuaW1hdGlvbiB3aXRoLlxyXG4gICAgICogQHJldHVybnMgYSBUdXBlbCBjb250YWluaW5nIHRoZSBNdXRhdG9yIGZvciBBbmltYXRpb24gYW5kIHRoZSBwbGF5bW9kZSBjb3JyZWN0ZWQgdGltZS4gXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZUFuaW1hdGlvbihfdGltZTogbnVtYmVyKTogW011dGF0b3IsIG51bWJlcl0ge1xyXG4gICAgICByZXR1cm4gdGhpcy51cGRhdGVBbmltYXRpb25Mb29wKG51bGwsIF90aW1lKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gdHJhbnNmZXJcclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IHM6IFNlcmlhbGl6YXRpb24gPSBzdXBlci5zZXJpYWxpemUoKTtcclxuICAgICAgc1tcImFuaW1hdGlvblwiXSA9IHRoaXMuYW5pbWF0aW9uLnNlcmlhbGl6ZSgpO1xyXG4gICAgICBzW1wicGxheW1vZGVcIl0gPSB0aGlzLnBsYXltb2RlO1xyXG4gICAgICBzW1wicGxheWJhY2tcIl0gPSB0aGlzLnBsYXliYWNrO1xyXG4gICAgICBzW1wic3BlZWRTY2FsZVwiXSA9IHRoaXMuc3BlZWRTY2FsZTtcclxuICAgICAgc1tcInNwZWVkU2NhbGVzV2l0aEdsb2JhbFNwZWVkXCJdID0gdGhpcy5zcGVlZFNjYWxlc1dpdGhHbG9iYWxTcGVlZDtcclxuXHJcbiAgICAgIHNbc3VwZXIuY29uc3RydWN0b3IubmFtZV0gPSBzdXBlci5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgIHJldHVybiBzO1xyXG4gICAgfVxyXG5cclxuICAgIGRlc2VyaWFsaXplKF9zOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgdGhpcy5hbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uKFwiXCIpO1xyXG4gICAgICB0aGlzLmFuaW1hdGlvbi5kZXNlcmlhbGl6ZShfcy5hbmltYXRpb24pO1xyXG4gICAgICB0aGlzLnBsYXliYWNrID0gX3MucGxheWJhY2s7XHJcbiAgICAgIHRoaXMucGxheW1vZGUgPSBfcy5wbGF5bW9kZTtcclxuICAgICAgdGhpcy5zcGVlZFNjYWxlID0gX3Muc3BlZWRTY2FsZTtcclxuICAgICAgdGhpcy5zcGVlZFNjYWxlc1dpdGhHbG9iYWxTcGVlZCA9IF9zLnNwZWVkU2NhbGVzV2l0aEdsb2JhbFNwZWVkO1xyXG5cclxuICAgICAgc3VwZXIuZGVzZXJpYWxpemUoX3Nbc3VwZXIuY29uc3RydWN0b3IubmFtZV0pO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiB1cGRhdGVBbmltYXRpb25cclxuICAgIC8qKlxyXG4gICAgICogVXBkYXRlcyB0aGUgQW5pbWF0aW9uLlxyXG4gICAgICogR2V0cyBjYWxsZWQgZXZlcnkgdGltZSB0aGUgTG9vcCBmaXJlcyB0aGUgTE9PUF9GUkFNRSBFdmVudC5cclxuICAgICAqIFVzZXMgdGhlIGJ1aWx0LWluIHRpbWUgdW5sZXNzIGEgZGlmZmVyZW50IHRpbWUgaXMgc3BlY2lmaWVkLlxyXG4gICAgICogTWF5IGFsc28gYmUgY2FsbGVkIGZyb20gdXBkYXRlQW5pbWF0aW9uKCkuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdXBkYXRlQW5pbWF0aW9uTG9vcChfZTogRXZlbnQsIF90aW1lOiBudW1iZXIpOiBbTXV0YXRvciwgbnVtYmVyXSB7XHJcbiAgICAgIGlmICh0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUgPT0gMClcclxuICAgICAgICByZXR1cm4gW251bGwsIDBdO1xyXG4gICAgICBsZXQgdGltZTogbnVtYmVyID0gX3RpbWUgfHwgdGhpcy5sb2NhbFRpbWUuZ2V0KCk7XHJcbiAgICAgIGlmICh0aGlzLnBsYXliYWNrID09IEFOSU1BVElPTl9QTEFZQkFDSy5GUkFNRUJBU0VEKSB7XHJcbiAgICAgICAgdGltZSA9IHRoaXMubGFzdFRpbWUgKyAoMTAwMCAvIHRoaXMuYW5pbWF0aW9uLmZwcyk7XHJcbiAgICAgIH1cclxuICAgICAgbGV0IGRpcmVjdGlvbjogbnVtYmVyID0gdGhpcy5jYWxjdWxhdGVEaXJlY3Rpb24odGltZSk7XHJcbiAgICAgIHRpbWUgPSB0aGlzLmFwcGx5UGxheW1vZGVzKHRpbWUpO1xyXG4gICAgICB0aGlzLmV4ZWN1dGVFdmVudHModGhpcy5hbmltYXRpb24uZ2V0RXZlbnRzVG9GaXJlKHRoaXMubGFzdFRpbWUsIHRpbWUsIHRoaXMucGxheWJhY2ssIGRpcmVjdGlvbikpO1xyXG5cclxuICAgICAgaWYgKHRoaXMubGFzdFRpbWUgIT0gdGltZSkge1xyXG4gICAgICAgIHRoaXMubGFzdFRpbWUgPSB0aW1lO1xyXG4gICAgICAgIHRpbWUgPSB0aW1lICUgdGhpcy5hbmltYXRpb24udG90YWxUaW1lO1xyXG4gICAgICAgIGxldCBtdXRhdG9yOiBNdXRhdG9yID0gdGhpcy5hbmltYXRpb24uZ2V0TXV0YXRlZCh0aW1lLCBkaXJlY3Rpb24sIHRoaXMucGxheWJhY2spO1xyXG4gICAgICAgIGlmICh0aGlzLmdldENvbnRhaW5lcigpKSB7XHJcbiAgICAgICAgICB0aGlzLmdldENvbnRhaW5lcigpLmFwcGx5QW5pbWF0aW9uKG11dGF0b3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW211dGF0b3IsIHRpbWVdO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBbbnVsbCwgdGltZV07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaXJlcyBhbGwgY3VzdG9tIGV2ZW50cyB0aGUgQW5pbWF0aW9uIHNob3VsZCBoYXZlIGZpcmVkIGJldHdlZW4gdGhlIGxhc3QgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxyXG4gICAgICogQHBhcmFtIGV2ZW50cyBhIGxpc3Qgb2YgbmFtZXMgb2YgY3VzdG9tIGV2ZW50cyB0byBmaXJlXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgZXhlY3V0ZUV2ZW50cyhldmVudHM6IHN0cmluZ1tdKTogdm9pZCB7XHJcbiAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KGV2ZW50c1tpXSkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBhY3R1YWwgdGltZSB0byB1c2UsIHVzaW5nIHRoZSBjdXJyZW50IHBsYXltb2Rlcy5cclxuICAgICAqIEBwYXJhbSBfdGltZSB0aGUgdGltZSB0byBhcHBseSB0aGUgcGxheW1vZGVzIHRvXHJcbiAgICAgKiBAcmV0dXJucyB0aGUgcmVjYWxjdWxhdGVkIHRpbWVcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhcHBseVBsYXltb2RlcyhfdGltZTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgc3dpdGNoICh0aGlzLnBsYXltb2RlKSB7XHJcbiAgICAgICAgY2FzZSBBTklNQVRJT05fUExBWU1PREUuU1RPUDpcclxuICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsVGltZS5nZXRPZmZzZXQoKTtcclxuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5QTEFZT05DRTpcclxuICAgICAgICAgIGlmIChfdGltZSA+PSB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUgLSAwLjAxOyAgICAgLy9UT0RPOiB0aGlzIG1pZ2h0IGNhdXNlIHNvbWUgaXNzdWVzXHJcbiAgICAgICAgICBlbHNlIHJldHVybiBfdGltZTtcclxuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5QTEFZT05DRVNUT1BBRlRFUjpcclxuICAgICAgICAgIGlmIChfdGltZSA+PSB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUgKyAwLjAxOyAgICAgLy9UT0RPOiB0aGlzIG1pZ2h0IGNhdXNlIHNvbWUgaXNzdWVzXHJcbiAgICAgICAgICBlbHNlIHJldHVybiBfdGltZTtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgcmV0dXJuIF90aW1lO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxjdWxhdGVzIGFuZCByZXR1cm5zIHRoZSBkaXJlY3Rpb24gdGhlIGFuaW1hdGlvbiBzaG91bGQgY3VycmVudGx5IGJlIHBsYXlpbmcgaW4uXHJcbiAgICAgKiBAcGFyYW0gX3RpbWUgdGhlIHRpbWUgYXQgd2hpY2ggdG8gY2FsY3VsYXRlIHRoZSBkaXJlY3Rpb25cclxuICAgICAqIEByZXR1cm5zIDEgaWYgZm9yd2FyZCwgMCBpZiBzdG9wLCAtMSBpZiBiYWNrd2FyZHNcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjYWxjdWxhdGVEaXJlY3Rpb24oX3RpbWU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgIHN3aXRjaCAodGhpcy5wbGF5bW9kZSkge1xyXG4gICAgICAgIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlNUT1A6XHJcbiAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAvLyBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5QSU5HUE9ORzpcclxuICAgICAgICAvLyAgIGlmIChNYXRoLmZsb29yKF90aW1lIC8gdGhpcy5hbmltYXRpb24udG90YWxUaW1lKSAlIDIgPT0gMClcclxuICAgICAgICAvLyAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgLy8gICBlbHNlXHJcbiAgICAgICAgLy8gICAgIHJldHVybiAtMTtcclxuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5SRVZFUlNFTE9PUDpcclxuICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5QTEFZT05DRTpcclxuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5QTEFZT05DRVNUT1BBRlRFUjpcclxuICAgICAgICAgIGlmIChfdGltZSA+PSB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVcGRhdGVzIHRoZSBzY2FsZSBvZiB0aGUgYW5pbWF0aW9uIGlmIHRoZSB1c2VyIGNoYW5nZXMgaXQgb3IgaWYgdGhlIGdsb2JhbCBnYW1lIHRpbWVyIGNoYW5nZWQgaXRzIHNjYWxlLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHVwZGF0ZVNjYWxlKCk6IHZvaWQge1xyXG4gICAgICBsZXQgbmV3U2NhbGU6IG51bWJlciA9IHRoaXMuc3BlZWRTY2FsZTtcclxuICAgICAgaWYgKHRoaXMuc3BlZWRTY2FsZXNXaXRoR2xvYmFsU3BlZWQpXHJcbiAgICAgICAgbmV3U2NhbGUgKj0gVGltZS5nYW1lLmdldFNjYWxlKCk7XHJcbiAgICAgIHRoaXMubG9jYWxUaW1lLnNldFNjYWxlKG5ld1NjYWxlKTtcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG4gIH1cclxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xyXG4gIC8qKlxyXG4gICAqIEF0dGFjaGVzIGEgW1tDb21wb25lbnRBdWRpb11dIHRvIGEgW1tOb2RlXV0uXHJcbiAgICogT25seSBhIHNpbmdsZSBbW0F1ZGlvXV0gY2FuIGJlIHVzZWQgd2l0aGluIGEgc2luZ2xlIFtbQ29tcG9uZW50QXVkaW9dXVxyXG4gICAqIEBhdXRob3JzIFRob21hcyBEb3JuZXIsIEhGVSwgMjAxOSB8IEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDE5XHJcbiAgICovXHJcbiAgZXhwb3J0IGNsYXNzIENvbXBvbmVudEF1ZGlvIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuICAgIHB1YmxpYyBwaXZvdDogTWF0cml4NHg0ID0gTWF0cml4NHg0LklERU5USVRZO1xyXG4gICAgcHVibGljIGdhaW46IEdhaW5Ob2RlO1xyXG5cclxuICAgIHByb3RlY3RlZCBzaW5nbGV0b246IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIHByaXZhdGUgcGFubmVyOiBQYW5uZXJOb2RlO1xyXG4gICAgcHJpdmF0ZSBzb3VyY2U6IEF1ZGlvQnVmZmVyU291cmNlTm9kZTtcclxuICAgIHByaXZhdGUgYXVkaW9NYW5hZ2VyOiBBdWRpb01hbmFnZXI7XHJcbiAgICBwcml2YXRlIHBsYXlpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAvLyBzb2xlbHkgZm9yIHRlc3RpbmcgY29tcG9uZW50IHN0YW5kYWxvbmUuIERldGVybWluZSBhdCBydW50aW1lXHJcbiAgICAvLyBwcml2YXRlIGF0dGFjaGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBwcml2YXRlIGxpc3RlbmVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3RydWN0b3IoX2F1ZGlvOiBBdWRpbyA9IG51bGwsIF9sb29wOiBib29sZWFuID0gZmFsc2UsIF9zdGFydDogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICAgIHN1cGVyKCk7XHJcbiAgICAgIHRoaXMuaW5zdGFsbCgpO1xyXG4gICAgICB0aGlzLmNyZWF0ZVNvdXJjZShfYXVkaW8sIF9sb29wKTtcclxuXHJcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihFVkVOVC5DT01QT05FTlRfQURELCB0aGlzLmhhbmRsZUF0dGFjaCk7XHJcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihFVkVOVC5DT01QT05FTlRfUkVNT1ZFLCB0aGlzLmhhbmRsZUF0dGFjaCk7XHJcblxyXG4gICAgICBpZiAoX3N0YXJ0KVxyXG4gICAgICAgIHRoaXMucGxheShfc3RhcnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgYXVkaW8oX2F1ZGlvOiBBdWRpbykge1xyXG4gICAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSBfYXVkaW87XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBhdWRpbygpOiBBdWRpbyB7XHJcbiAgICAgIHJldHVybiA8QXVkaW8+dGhpcy5zb3VyY2UuYnVmZmVyO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBwbGF5KF9vbjogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICBpZiAoX29uKSB7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVTb3VyY2UodGhpcy5hdWRpbywgdGhpcy5zb3VyY2UubG9vcCk7XHJcbiAgICAgICAgdGhpcy5zb3VyY2Uuc3RhcnQoMCwgMCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICAgIHRoaXMuc291cmNlLnN0b3AoKTtcclxuICAgICAgdGhpcy5wbGF5aW5nID0gX29uO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHB1YmxpYyByZXNldCgpOiB2b2lkIHtcclxuICAgIC8vICAgdGhpcy5zb3VyY2UucmVcclxuICAgIC8vIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGlzUGxheWluZygpOiBib29sZWFuIHtcclxuICAgICAgcmV0dXJuIHRoaXMucGxheWluZztcclxuICAgIH1cclxuICAgIHB1YmxpYyBnZXQgaXNDb25uZWN0ZWQoKTogYm9vbGVhbiB7XHJcbiAgICAgIHJldHVybiB0aGlzLmNvbm5lY3RlZDtcclxuICAgIH1cclxuICAgIHB1YmxpYyBnZXQgaXNBdHRhY2hlZCgpOiBib29sZWFuIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29udGFpbmVyKCkgIT0gbnVsbDtcclxuICAgIH1cclxuICAgIHB1YmxpYyBnZXQgaXNMaXN0ZW5lZCgpOiBib29sZWFuIHtcclxuICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHVibGljIGdldCBpc0Nvbm5lY3RlZCgpOiBib29sZWFuIHtcclxuICAgIC8vICAgcmV0dXJuIHRoaXMuY29ubmVjdGVkO1xyXG4gICAgLy8gfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQWN0aXZhdGUgb3ZlcnJpZGUuIENvbm5lY3RzIG9yIGRpc2Nvbm5lY3RzIEF1ZGlvTm9kZXNcclxuICAgICAqL1xyXG4gICAgcHVibGljIGFjdGl2YXRlKF9vbjogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICBzdXBlci5hY3RpdmF0ZShfb24pO1xyXG4gICAgICB0aGlzLnVwZGF0ZUNvbm5lY3Rpb24oKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaW5zdGFsbChfYXVkaW9NYW5hZ2VyOiBBdWRpb01hbmFnZXIgPSBBdWRpb01hbmFnZXIuZGVmYXVsdCk6IHZvaWQge1xyXG4gICAgICBsZXQgYWN0aXZlOiBib29sZWFuID0gdGhpcy5pc0FjdGl2ZTtcclxuICAgICAgdGhpcy5hY3RpdmF0ZShmYWxzZSk7XHJcbiAgICAgIHRoaXMuYXVkaW9NYW5hZ2VyID0gX2F1ZGlvTWFuYWdlcjtcclxuICAgICAgdGhpcy5wYW5uZXIgPSBfYXVkaW9NYW5hZ2VyLmNyZWF0ZVBhbm5lcigpO1xyXG4gICAgICB0aGlzLmdhaW4gPSBfYXVkaW9NYW5hZ2VyLmNyZWF0ZUdhaW4oKTtcclxuICAgICAgdGhpcy5wYW5uZXIuY29ubmVjdCh0aGlzLmdhaW4pO1xyXG4gICAgICB0aGlzLmdhaW4uY29ubmVjdChfYXVkaW9NYW5hZ2VyLmdhaW4pO1xyXG4gICAgICB0aGlzLmFjdGl2YXRlKGFjdGl2ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNyZWF0ZVNvdXJjZShfYXVkaW86IEF1ZGlvLCBfbG9vcDogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICB0aGlzLnNvdXJjZSA9IHRoaXMuYXVkaW9NYW5hZ2VyLmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xyXG4gICAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMucGFubmVyKTtcclxuXHJcbiAgICAgIGlmIChfYXVkaW8pXHJcbiAgICAgICAgdGhpcy5hdWRpbyA9IF9hdWRpbztcclxuICAgICAgdGhpcy5zb3VyY2UubG9vcCA9IF9sb29wO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjb25uZWN0KF9vbjogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICBpZiAoX29uKVxyXG4gICAgICAgIHRoaXMuZ2Fpbi5jb25uZWN0KHRoaXMuYXVkaW9NYW5hZ2VyLmdhaW4pO1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgdGhpcy5nYWluLmRpc2Nvbm5lY3QodGhpcy5hdWRpb01hbmFnZXIuZ2Fpbik7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVDb25uZWN0aW9uKCk6IHZvaWQge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHRoaXMuY29ubmVjdCh0aGlzLmlzQWN0aXZlICYmIHRoaXMuaXNBdHRhY2hlZCAmJiB0aGlzLmxpc3RlbmVkKTtcclxuICAgICAgfSBjYXRjaCAoX2Vycm9yKSB7XHJcbiAgICAgICAgLy8gbm9wXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogXHJcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGNvbm5lY3RzL2Rpc2Nvbm5lY3RzIEF1ZGlvTm9kZXMgd2hlbiBhZGRpbmcvcmVtb3ZpbmcgdGhpcyBjb21wb25lbnQgdG8vZnJvbSBhIG5vZGUuIFxyXG4gICAgICogVGhlcmVmb3JlIHVudXNlZCBBdWRpb05vZGVzIG1heSBiZSBnYXJiYWdlIGNvbGxlY3RlZCB3aGVuIGFuIHVudXNlZCBjb21wb25lbnQgaXMgY29sbGVjdGVkXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgaGFuZGxlQXR0YWNoID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgRGVidWcubG9nKF9ldmVudCk7XHJcbiAgICAgIGlmIChfZXZlbnQudHlwZSA9PSBFVkVOVC5DT01QT05FTlRfQUREKSB7XHJcbiAgICAgICAgdGhpcy5nZXRDb250YWluZXIoKS5hZGRFdmVudExpc3RlbmVyKEVWRU5UX0FVRElPLkNISUxEX0FQUEVORCwgdGhpcy5oYW5kbGVCcmFuY2gsIHRydWUpO1xyXG4gICAgICAgIHRoaXMuZ2V0Q29udGFpbmVyKCkuYWRkRXZlbnRMaXN0ZW5lcihFVkVOVF9BVURJTy5DSElMRF9SRU1PVkUsIHRoaXMuaGFuZGxlQnJhbmNoLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmdldENvbnRhaW5lcigpLmFkZEV2ZW50TGlzdGVuZXIoRVZFTlRfQVVESU8uVVBEQVRFX1BBTk5FUiwgdGhpcy51cGRhdGVQYW5uZXIsIHRydWUpO1xyXG4gICAgICAgIHRoaXMubGlzdGVuZWQgPSB0aGlzLmdldENvbnRhaW5lcigpLmlzRGVzY2VuZGFudE9mKEF1ZGlvTWFuYWdlci5kZWZhdWx0LmdldEJyYW5jaExpc3RlbmluZ1RvKCkpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHRoaXMuZ2V0Q29udGFpbmVyKCkucmVtb3ZlRXZlbnRMaXN0ZW5lcihFVkVOVF9BVURJTy5DSElMRF9BUFBFTkQsIHRoaXMuaGFuZGxlQnJhbmNoLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmdldENvbnRhaW5lcigpLnJlbW92ZUV2ZW50TGlzdGVuZXIoRVZFTlRfQVVESU8uQ0hJTERfUkVNT1ZFLCB0aGlzLmhhbmRsZUJyYW5jaCwgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5nZXRDb250YWluZXIoKS5yZW1vdmVFdmVudExpc3RlbmVyKEVWRU5UX0FVRElPLlVQREFURV9QQU5ORVIsIHRoaXMudXBkYXRlUGFubmVyLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmxpc3RlbmVkID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy51cGRhdGVDb25uZWN0aW9uKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFxyXG4gICAgICogQXV0b21hdGljYWxseSBjb25uZWN0cy9kaXNjb25uZWN0cyBBdWRpb05vZGVzIHdoZW4gYXBwZW5kaW5nL3JlbW92aW5nIHRoZSBicmFuY2ggdGhlIGNvbXBvbmVudCBpcyBpbi4gXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgaGFuZGxlQnJhbmNoID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgRGVidWcubG9nKF9ldmVudCk7XHJcbiAgICAgIHRoaXMubGlzdGVuZWQgPSAoX2V2ZW50LnR5cGUgPT0gRVZFTlRfQVVESU8uQ0hJTERfQVBQRU5EKTtcclxuICAgICAgdGhpcy51cGRhdGVDb25uZWN0aW9uKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFxyXG4gICAgICogVXBkYXRlcyB0aGUgcGFubmVyIG5vZGUsIGl0cyBwb3NpdGlvbiBhbmQgZGlyZWN0aW9uLCB1c2luZyB0aGUgd29ybGRtYXRyaXggb2YgdGhlIGNvbnRhaW5lciBhbmQgdGhlIHBpdm90IG9mIHRoaXMgY29tcG9uZW50LiBcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB1cGRhdGVQYW5uZXIgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICBEZWJ1Zy5sb2coX2V2ZW50KTtcclxuICAgICAgbGV0IGxvY2FsOiBNYXRyaXg0eDQgPSBNYXRyaXg0eDQuTVVMVElQTElDQVRJT04odGhpcy5nZXRDb250YWluZXIoKS5tdHhXb3JsZCwgdGhpcy5waXZvdCk7XHJcbiAgICAgIERlYnVnLmxvZyhsb2NhbC50b1N0cmluZygpKTtcclxuICAgICAgdGhpcy5wYW5uZXIuc2V0UG9zaXRpb24obG9jYWwudHJhbnNsYXRpb24ueCwgbG9jYWwudHJhbnNsYXRpb24ueSwgbG9jYWwudHJhbnNsYXRpb24ueik7XHJcbiAgICB9XHJcbiAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEF0dGFjaGVzIGFuIFtbQXVkaW9MaXN0ZW5lcl1dIHRvIHRoZSBub2RlXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudEF1ZGlvTGlzdGVuZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cclxuICAgICAgICBwcml2YXRlIGF1ZGlvTGlzdGVuZXI6IEF1ZGlvTGlzdGVuZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvbkJhc2U6IFZlY3RvcjM7XHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvblVQOiBWZWN0b3IzO1xyXG4gICAgICAgIHByaXZhdGUgcG9zaXRpb25GVzogVmVjdG9yMztcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29uc3RydWN0b3Igb2YgdGhlIEF1ZGlvTGlzdGVuZXIgY2xhc3NcclxuICAgICAgICAgKiBAcGFyYW0gX2F1ZGlvQ29udGV4dCBBdWRpbyBDb250ZXh0IGZyb20gQXVkaW9TZXNzaW9uRGF0YVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9MaXN0ZW5lciA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmxpc3RlbmVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEF1ZGlvTGlzdGVuZXIoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkubGlzdGVuZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0QXVkaW9MaXN0ZW5lcigpOiBBdWRpb0xpc3RlbmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXVkaW9MaXN0ZW5lcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFdlIHdpbGwgY2FsbCBzZXRBdWRpb0xpc3RlbmVyUG9zaXRpb24gd2hlbmV2ZXIgdGhlcmUgaXMgYSBuZWVkIHRvIGNoYW5nZSBQb3NpdGlvbnMuXHJcbiAgICAgICAgICogQWxsIHRoZSBwb3NpdGlvbiB2YWx1ZXMgc2hvdWxkIGJlIGlkZW50aWNhbCB0byB0aGUgY3VycmVudCBQb3NpdGlvbiB0aGlzIGlzIGF0dGFjaGVkIHRvLlxyXG4gICAgICAgICAqICAgICAgIFxyXG4gICAgICAgICAqICAgICBfX3xfX19cclxuICAgICAgICAgKiAgICB8ICB8ICB8XHJcbiAgICAgICAgICogICAgfCAgwrAtLXwtLVxyXG4gICAgICAgICAqICAgIHwvX19fX3xcclxuICAgICAgICAgKiAgIC9cclxuICAgICAgICAgKiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0TGlzdGVuZXJQb3NpdGlvbihfcG9zaXRpb246IFZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJhc2UgPSBfcG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25YLnZhbHVlID0gdGhpcy5wb3NpdGlvbkJhc2UueDtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWS52YWx1ZSA9IC10aGlzLnBvc2l0aW9uQmFzZS56O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25aLnZhbHVlID0gdGhpcy5wb3NpdGlvbkJhc2UueTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU2V0IExpc3RlbmVyIFBvc2l0aW9uOiBYOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5wb3NpdGlvblgudmFsdWUgKyBcIiB8IFk6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25aLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRMaXN0ZW5lclBvc2l0aW9uKCk6IFZlY3RvcjMge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbkJhc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBGVURHRSBTWVNURU1cclxuICAgICAgICAgKiBcclxuICAgICAgICAgKiAgICAgIFVQIChZKVxyXG4gICAgICAgICAqICAgICAgIF5cclxuICAgICAgICAgKiAgICAgX198X19fXHJcbiAgICAgICAgICogICAgfCAgfCAgfFxyXG4gICAgICAgICAqICAgIHwgIE8tLXwtLT4gRk9SV0FSRCAoWilcclxuICAgICAgICAgKiAgICB8X19fX198XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldExpc3RlbmVyUG9zaXRpb25Gb3J3YXJkKF9wb3NpdGlvbjogVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uRlcgPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIC8vU2V0IGZvcndhcmQgbG9va2luZyBwb3NpdGlvbiBvZiB0aGUgQXVkaW9MaXN0ZW5lclxyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIuZm9yd2FyZFgudmFsdWUgPSB0aGlzLnBvc2l0aW9uRlcueDtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRZLnZhbHVlID0gLXRoaXMucG9zaXRpb25GVy56ICsgMTtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRaLnZhbHVlID0gdGhpcy5wb3NpdGlvbkZXLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TGlzdGVuZXJQb3NpdGlvbkZvcndhcmQoKTogVmVjdG9yMyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uRlc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiAgICAgIFVQIChaKVxyXG4gICAgICAgICAqICAgICAgIF5cclxuICAgICAgICAgKiAgICAgX198X19fXHJcbiAgICAgICAgICogICAgfCAgfCAgfFxyXG4gICAgICAgICAqICAgIHwgIE8tLXwtLT4gRk9SV0FSRCAoWClcclxuICAgICAgICAgKiAgICB8X19fX198XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldExpc3RlbmVyUG9zdGl0aW9uVXAoX3Bvc2l0aW9uOiBWZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25VUCA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgLy9TZXQgdXB3YXJkIGxvb2tpbmcgcG9zaXRpb24gb2YgdGhlIEF1ZGlvTGlzdGVuZXJcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLnVwWC52YWx1ZSA9IHRoaXMucG9zaXRpb25VUC54O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIudXBZLnZhbHVlID0gLXRoaXMucG9zaXRpb25VUC56O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIudXBaLnZhbHVlID0gdGhpcy5wb3NpdGlvblVQLnkgKyAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldExpc3RlbmVyUG9zaXRpb25VcCgpOiBWZWN0b3IzIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucG9zaXRpb25VUDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCBhbGwgcG9zaXRpb25hbCBWYWx1ZXMgYmFzZWQgb24gYSBzaW5nbGUgUG9zaXRpb25cclxuICAgICAgICAgKiBAcGFyYW0gX3Bvc2l0aW9uIHBvc2l0aW9uIG9mIHRoZSBPYmplY3RcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgdXBkYXRlUG9zaXRpb25zKF9wb3NpdGlvbjogVmVjdG9yMy8qLCBfcG9zaXRpb25Gb3J3YXJkOiBWZWN0b3IzLCBfcG9zaXRpb25VcDogVmVjdG9yMyovKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TGlzdGVuZXJQb3NpdGlvbihfcG9zaXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLnNldExpc3RlbmVyUG9zaXRpb25Gb3J3YXJkKF9wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TGlzdGVuZXJQb3N0aXRpb25VcChfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2hvdyBhbGwgU2V0dGluZ3MgaW5zaWRlIG9mIFtbQ29tcG9uZW50QXVkaW9MaXN0ZW5lcl1dLlxyXG4gICAgICAgICAqIE1ldGhvZCBvbmx5IGZvciBEZWJ1Z2dpbmcgUHVycG9zZXMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNob3dMaXN0ZW5lclNldHRpbmdzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTaG93IGFsbCBTZXR0aW5ncyBvZiBMaXN0ZW5lclwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuZXIgUG9zaXRpb24gQmFzZTogWDogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25YLnZhbHVlICsgXCIgfCBZOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5wb3NpdGlvblkudmFsdWUgKyBcIiB8IFo6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWi52YWx1ZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuZXIgUG9zaXRpb24gVXA6IFg6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnVwWC52YWx1ZSArIFwiIHwgWTogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIudXBZLnZhbHVlICsgXCIgfCBaOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci51cFoudmFsdWUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxpc3RlbmVyIFBvc2l0aW9uIEZvcndhcmQ6IFg6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRYLnZhbHVlICsgXCIgfCBZOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5mb3J3YXJkWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIuZm9yd2FyZFoudmFsdWUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxyXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XHJcbiAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgYXVkaW9MaXN0ZW5lcjogdGhpcy5hdWRpb0xpc3RlbmVyLFxyXG4gICAgICAgICAgICAgICAgcG9zQmFzZTogdGhpcy5wb3NpdGlvbkJhc2UsXHJcbiAgICAgICAgICAgICAgICBwb3NGVzogdGhpcy5wb3NpdGlvbkZXLFxyXG4gICAgICAgICAgICAgICAgcG9zVVA6IHRoaXMucG9zaXRpb25VUFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICBcclxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIgPSBfc2VyaWFsaXphdGlvbi5hdWRpb0xpc3RlbmVyO1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uQmFzZSA9IF9zZXJpYWxpemF0aW9uLnBvc0Jhc2U7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25GVyA9IF9zZXJpYWxpemF0aW9uLnBvc0ZXO1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uVVAgPSBfc2VyaWFsaXphdGlvbi5wb3NVUDtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuYXVkaW9MaXN0ZW5lcjtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMucG9zaXRpb25CYXNlO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wb3NpdGlvbkZXO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wb3NpdGlvblVQO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxufVxyXG4iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAvKipcclxuICAgKiBBdHRhY2hlcyBhIFtbQ29tcG9uZW50QXVkaW9dXSB0byBhIFtbTm9kZV1dLlxyXG4gICAqIE9ubHkgYSBzaW5nbGUgW1tBdWRpb11dIGNhbiBiZSB1c2VkIHdpdGhpbiBhIHNpbmdsZSBbW0NvbXBvbmVudEF1ZGlvXV1cclxuICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTkgfCBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxyXG4gICAqL1xyXG4gIGV4cG9ydCBjbGFzcyBDb21wb25lbnRBdWRpb1ggZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cclxuICAgIHB1YmxpYyBhdWRpbzogQXVkaW9YIHwgbnVsbDtcclxuICAgIHB1YmxpYyBhdWRpb09zY2lsbGF0b3I6IEF1ZGlvT3NjaWxsYXRvcjtcclxuXHJcbiAgICBwdWJsaWMgaXNMb2NhbGlzZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIHB1YmxpYyBpc0ZpbHRlcmVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgaXNEZWxheWVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgcHJvdGVjdGVkIHNpbmdsZXRvbjogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIHByaXZhdGUgbG9jYWxpc2F0aW9uOiBBdWRpb0xvY2FsaXNhdGlvbiB8IG51bGw7XHJcbiAgICBwcml2YXRlIGZpbHRlcjogQXVkaW9GaWx0ZXIgfCBudWxsO1xyXG4gICAgcHJpdmF0ZSBkZWxheTogQXVkaW9EZWxheSB8IG51bGw7XHJcbiAgICBwcml2YXRlIHBsYXlpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSBDb21wb25lbnQgQXVkaW8gZm9yIFxyXG4gICAgICogQHBhcmFtIF9hdWRpbyBcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoX2F1ZGlvPzogQXVkaW9YLCBfYXVkaW9Pc2NpbGxhdG9yPzogQXVkaW9Pc2NpbGxhdG9yKSB7XHJcbiAgICAgIHN1cGVyKCk7XHJcbiAgICAgIGlmIChfYXVkaW8pIHtcclxuICAgICAgICB0aGlzLnNldEF1ZGlvKF9hdWRpbyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHNldCBBdWRpb0ZpbHRlciBpbiBDb21wb25lbnRBdWRpb1xyXG4gICAgICogQHBhcmFtIF9maWx0ZXIgQXVkaW9GaWx0ZXIgXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzZXRGaWx0ZXIoX2ZpbHRlcjogQXVkaW9GaWx0ZXIpOiB2b2lkIHtcclxuICAgICAgdGhpcy5maWx0ZXIgPSBfZmlsdGVyO1xyXG4gICAgICB0aGlzLmlzRmlsdGVyZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRGaWx0ZXIoKTogQXVkaW9GaWx0ZXIge1xyXG4gICAgICByZXR1cm4gdGhpcy5maWx0ZXI7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldERlbGF5KF9kZWxheTogQXVkaW9EZWxheSk6IHZvaWQge1xyXG4gICAgICB0aGlzLmRlbGF5ID0gX2RlbGF5O1xyXG4gICAgICB0aGlzLmlzRGVsYXllZCA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldERlbGF5KCk6IEF1ZGlvRGVsYXkge1xyXG4gICAgICByZXR1cm4gdGhpcy5kZWxheTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0TG9jYWxpc2F0aW9uKF9sb2NhbGlzYXRpb246IEF1ZGlvTG9jYWxpc2F0aW9uKTogdm9pZCB7XHJcbiAgICAgIHRoaXMubG9jYWxpc2F0aW9uID0gX2xvY2FsaXNhdGlvbjtcclxuICAgICAgdGhpcy5pc0xvY2FsaXNlZCA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldExvY2FsaXNhdGlvbigpOiBBdWRpb0xvY2FsaXNhdGlvbiB7XHJcbiAgICAgIHJldHVybiB0aGlzLmxvY2FsaXNhdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBsYXkgQXVkaW8gYXQgY3VycmVudCB0aW1lIG9mIEF1ZGlvQ29udGV4dFxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgcGxheUF1ZGlvKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfb2Zmc2V0PzogbnVtYmVyLCBfZHVyYXRpb24/OiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgdGhpcy5hdWRpby5pbml0QnVmZmVyU291cmNlKF9hdWRpb1NldHRpbmdzKTtcclxuICAgICAgdGhpcy5jb25uZWN0QXVkaW9Ob2RlcyhfYXVkaW9TZXR0aW5ncyk7XHJcbiAgICAgIHRoaXMuYXVkaW8uYnVmZmVyU291cmNlLnN0YXJ0KF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmN1cnJlbnRUaW1lLCBfb2Zmc2V0LCBfZHVyYXRpb24pO1xyXG4gICAgICB0aGlzLnBsYXlpbmcgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBwdWJsaWMgc3RvcCgpOiB2b2lkIHtcclxuICAgICAgdGhpcy5hdWRpby5idWZmZXJTb3VyY2Uuc3RvcCgpO1xyXG4gICAgICB0aGlzLnBsYXlpbmcgPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGlzUGxheWluZygpOiBib29sZWFuIHtcclxuICAgICAgcmV0dXJuIHRoaXMucGxheWluZztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkZHMgYW4gW1tBdWRpb11dIHRvIHRoZSBbW0NvbXBvbmVudEF1ZGlvXV1cclxuICAgICAqIEBwYXJhbSBfYXVkaW8gQXVkaW8gRGF0YSBhcyBbW0F1ZGlvXV1cclxuICAgICAqL1xyXG4gICAgcHVibGljIHNldEF1ZGlvKF9hdWRpbzogQXVkaW9YKTogdm9pZCB7XHJcbiAgICAgIHRoaXMuYXVkaW8gPSBfYXVkaW87XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldEF1ZGlvKCk6IEF1ZGlvWCB7XHJcbiAgICAgIHJldHVybiB0aGlzLmF1ZGlvO1xyXG4gICAgfVxyXG5cclxuICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxyXG4gICAgcHVibGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB7XHJcbiAgICAgICAgaXNGaWx0ZXJlZDogdGhpcy5pc0ZpbHRlcmVkLFxyXG4gICAgICAgIGlzRGVsYXllZDogdGhpcy5pc0RlbGF5ZWQsXHJcbiAgICAgICAgaXNMb2NhbGlzZWQ6IHRoaXMuaXNMb2NhbGlzZWQsXHJcbiAgICAgICAgYXVkaW86IHRoaXMuYXVkaW8sXHJcbiAgICAgICAgZmlsdGVyOiB0aGlzLmZpbHRlcixcclxuICAgICAgICBkZWxheTogdGhpcy5kZWxheSxcclxuICAgICAgICBsb2NhbGlzYXRpb246IHRoaXMubG9jYWxpc2F0aW9uXHJcbiAgICAgIH07XHJcbiAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XHJcbiAgICAgIHRoaXMuaXNGaWx0ZXJlZCA9IF9zZXJpYWxpemF0aW9uLmlzRmlsdGVyZWQ7XHJcbiAgICAgIHRoaXMuaXNEZWxheWVkID0gX3NlcmlhbGl6YXRpb24uaXNEZWxheWVkO1xyXG4gICAgICB0aGlzLmlzTG9jYWxpc2VkID0gX3NlcmlhbGl6YXRpb24uaXNMb2NhbGlzZWQ7XHJcbiAgICAgIHRoaXMuYXVkaW8gPSBfc2VyaWFsaXphdGlvbi5hdWRpbztcclxuICAgICAgdGhpcy5maWx0ZXIgPSBfc2VyaWFsaXphdGlvbi5maWx0ZXI7XHJcbiAgICAgIHRoaXMuZGVsYXkgPSBfc2VyaWFsaXphdGlvbi5kZWxheTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCByZWR1Y2VNdXRhdG9yKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZCB7XHJcbiAgICAgIGRlbGV0ZSB0aGlzLmF1ZGlvO1xyXG4gICAgICBkZWxldGUgdGhpcy5maWx0ZXI7XHJcbiAgICAgIGRlbGV0ZSB0aGlzLmRlbGF5O1xyXG4gICAgICBkZWxldGUgdGhpcy5sb2NhbGlzYXRpb247XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpbmFsIGF0dGFjaG1lbnRzIGZvciB0aGUgQXVkaW8gTm9kZXMgaW4gZm9sbG93aW5nIG9yZGVyLlxyXG4gICAgICogVGhpcyBtZXRob2QgbmVlZHMgdG8gYmUgY2FsbGVkIHdoZW5ldmVyIHRoZXJlIGlzIGEgY2hhbmdlIG9mIHBhcnRzIGluIHRoZSBbW0NvbXBvbmVudEF1ZGlvXV0uXHJcbiAgICAgKiAxLiBMb2NhbCBHYWluXHJcbiAgICAgKiAyLiBMb2NhbGlzYXRpb25cclxuICAgICAqIDMuIEZpbHRlclxyXG4gICAgICogNC4gRGVsYXlcclxuICAgICAqIDUuIE1hc3RlciBHYWluXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY29ubmVjdEF1ZGlvTm9kZXMoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MpOiB2b2lkIHtcclxuICAgICAgLy8gY29uc3QgYnVmZmVyU291cmNlOiBBdWRpb0J1ZmZlclNvdXJjZU5vZGUgPSB0aGlzLmF1ZGlvLmJ1ZmZlclNvdXJjZTtcclxuICAgICAgLy8gY29uc3QgZ2FpbkxvY2FsOiBHYWluTm9kZSA9IHRoaXMuYXVkaW8udm9sdW1lO1xyXG4gICAgICBsZXQgcGFubmVyOiBQYW5uZXJOb2RlO1xyXG4gICAgICBsZXQgZmlsdGVyOiBCaXF1YWRGaWx0ZXJOb2RlO1xyXG4gICAgICBsZXQgZGVsYXk6IERlbGF5Tm9kZTtcclxuICAgICAgY29uc3QgZ2Fpbk1hc3RlcjogR2Fpbk5vZGUgPSBfYXVkaW9TZXR0aW5ncy5tYXN0ZXJHYWluO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXCIpO1xyXG4gICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3RpbmcgUHJvcGVydGllcyBmb3IgQXVkaW9cIik7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuXHJcbiAgICAvLyAgYnVmZmVyU291cmNlLmNvbm5lY3QoZ2FpbkxvY2FsKTtcclxuXHJcbiAgICAgIGlmICh0aGlzLmlzTG9jYWxpc2VkICYmIHRoaXMubG9jYWxpc2F0aW9uICE9IG51bGwpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3QgTG9jYWxpc2F0aW9uXCIpO1xyXG4gICAgICAgIHBhbm5lciA9IHRoaXMubG9jYWxpc2F0aW9uLnBhbm5lck5vZGU7XHJcbiAgICAgICAgdGhpcy5hdWRpby5jb25uZWN0KHBhbm5lcik7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzRmlsdGVyZWQgJiYgdGhpcy5maWx0ZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IEZpbHRlclwiKTtcclxuICAgICAgICAgIGZpbHRlciA9IHRoaXMuZmlsdGVyLmF1ZGlvRmlsdGVyO1xyXG4gICAgICAgICAgcGFubmVyLmNvbm5lY3QoZmlsdGVyKTtcclxuXHJcbiAgICAgICAgICBpZiAodGhpcy5pc0RlbGF5ZWQgJiYgdGhpcy5kZWxheSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBEZWxheVwiKTtcclxuICAgICAgICAgICAgZGVsYXkgPSB0aGlzLmRlbGF5LmF1ZGlvRGVsYXk7XHJcbiAgICAgICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE1hc3RlciBHYWluXCIpO1xyXG4gICAgICAgICAgICBkZWxheS5jb25uZWN0KGdhaW5NYXN0ZXIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgZmlsdGVyLmNvbm5lY3QoZ2Fpbk1hc3Rlcik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgaWYgKHRoaXMuaXNEZWxheWVkICYmIHRoaXMuZGVsYXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3QgRGVsYXlcIik7XHJcbiAgICAgICAgICAgIGRlbGF5ID0gdGhpcy5kZWxheS5hdWRpb0RlbGF5O1xyXG4gICAgICAgICAgICBwYW5uZXIuY29ubmVjdChkZWxheSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgZGVsYXkuY29ubmVjdChnYWluTWFzdGVyKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3QgTWFzdGVyIEdhaW5cIik7XHJcbiAgICAgICAgICAgIHBhbm5lci5jb25uZWN0KGdhaW5NYXN0ZXIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICh0aGlzLmlzRmlsdGVyZWQgJiYgdGhpcy5maWx0ZXIgIT0gbnVsbCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBGaWx0ZXJcIik7XHJcbiAgICAgICAgZmlsdGVyID0gdGhpcy5maWx0ZXIuYXVkaW9GaWx0ZXI7XHJcbiAgICAgICAgdGhpcy5hdWRpby5jb25uZWN0KGZpbHRlcik7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzRGVsYXllZCAmJiB0aGlzLmRlbGF5ICE9IG51bGwpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBEZWxheVwiKTtcclxuICAgICAgICAgIGRlbGF5ID0gdGhpcy5kZWxheS5hdWRpb0RlbGF5O1xyXG4gICAgICAgICAgZmlsdGVyLmNvbm5lY3QoZGVsYXkpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE1hc3RlciBHYWluXCIpO1xyXG4gICAgICAgICAgZGVsYXkuY29ubmVjdChnYWluTWFzdGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3QgTWFzdGVyIEdhaW5cIik7XHJcbiAgICAgICAgICBmaWx0ZXIuY29ubmVjdChnYWluTWFzdGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAodGhpcy5pc0RlbGF5ZWQgJiYgdGhpcy5kZWxheSAhPSBudWxsKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IERlbGF5XCIpO1xyXG4gICAgICAgIGRlbGF5ID0gdGhpcy5kZWxheS5hdWRpb0RlbGF5O1xyXG4gICAgICAgIHRoaXMuYXVkaW8uY29ubmVjdChkZWxheSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE1hc3RlciBHYWluXCIpO1xyXG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZ2Fpbk1hc3Rlcik7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE9ubHkgTWFzdGVyIEdhaW5cIik7XHJcbiAgICAgICAgdGhpcy5hdWRpby5jb25uZWN0KGdhaW5NYXN0ZXIpO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgIH1cclxuICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29tcG9uZW50LnRzXCIvPlxyXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICBleHBvcnQgZW51bSBGSUVMRF9PRl9WSUVXIHtcclxuICAgIEhPUklaT05UQUwsIFZFUlRJQ0FMLCBESUFHT05BTFxyXG4gIH1cclxuICAvKipcclxuICAgKiBEZWZpbmVzIGlkZW50aWZpZXJzIGZvciB0aGUgdmFyaW91cyBwcm9qZWN0aW9ucyBhIGNhbWVyYSBjYW4gcHJvdmlkZS4gIFxyXG4gICAqIFRPRE86IGNoYW5nZSBiYWNrIHRvIG51bWJlciBlbnVtIGlmIHN0cmluZ3Mgbm90IG5lZWRlZFxyXG4gICAqL1xyXG4gIGV4cG9ydCBlbnVtIFBST0pFQ1RJT04ge1xyXG4gICAgQ0VOVFJBTCA9IFwiY2VudHJhbFwiLFxyXG4gICAgT1JUSE9HUkFQSElDID0gXCJvcnRob2dyYXBoaWNcIixcclxuICAgIERJTUVUUklDID0gXCJkaW1ldHJpY1wiLFxyXG4gICAgU1RFUkVPID0gXCJzdGVyZW9cIlxyXG4gIH1cclxuICAvKipcclxuICAgKiBUaGUgY2FtZXJhIGNvbXBvbmVudCBob2xkcyB0aGUgcHJvamVjdGlvbi1tYXRyaXggYW5kIG90aGVyIGRhdGEgbmVlZGVkIHRvIHJlbmRlciBhIHNjZW5lIGZyb20gdGhlIHBlcnNwZWN0aXZlIG9mIHRoZSBub2RlIGl0IGlzIGF0dGFjaGVkIHRvLlxyXG4gICAqIEBhdXRob3JzIEphc2NoYSBLYXJhZ8O2bCwgSEZVLCAyMDE5IHwgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcclxuICAgKi9cclxuICBleHBvcnQgY2xhc3MgQ29tcG9uZW50Q2FtZXJhIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuICAgIHB1YmxpYyBwaXZvdDogTWF0cml4NHg0ID0gTWF0cml4NHg0LklERU5USVRZO1xyXG4gICAgcHVibGljIGJhY2tncm91bmRDb2xvcjogQ29sb3IgPSBuZXcgQ29sb3IoMCwgMCwgMCwgMSk7IC8vIFRoZSBjb2xvciBvZiB0aGUgYmFja2dyb3VuZCB0aGUgY2FtZXJhIHdpbGwgcmVuZGVyLlxyXG4gICAgLy9wcml2YXRlIG9ydGhvZ3JhcGhpYzogYm9vbGVhbiA9IGZhbHNlOyAvLyBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGltYWdlIHdpbGwgYmUgcmVuZGVyZWQgd2l0aCBwZXJzcGVjdGl2ZSBvciBvcnRob2dyYXBoaWMgcHJvamVjdGlvbi5cclxuICAgIHByaXZhdGUgcHJvamVjdGlvbjogUFJPSkVDVElPTiA9IFBST0pFQ1RJT04uQ0VOVFJBTDtcclxuICAgIHByaXZhdGUgdHJhbnNmb3JtOiBNYXRyaXg0eDQgPSBuZXcgTWF0cml4NHg0OyAvLyBUaGUgbWF0cml4IHRvIG11bHRpcGx5IGVhY2ggc2NlbmUgb2JqZWN0cyB0cmFuc2Zvcm1hdGlvbiBieSwgdG8gZGV0ZXJtaW5lIHdoZXJlIGl0IHdpbGwgYmUgZHJhd24uXHJcbiAgICBwcml2YXRlIGZpZWxkT2ZWaWV3OiBudW1iZXIgPSA0NTsgLy8gVGhlIGNhbWVyYSdzIHNlbnNvcmFuZ2xlLlxyXG4gICAgcHJpdmF0ZSBhc3BlY3RSYXRpbzogbnVtYmVyID0gMS4wO1xyXG4gICAgcHJpdmF0ZSBkaXJlY3Rpb246IEZJRUxEX09GX1ZJRVcgPSBGSUVMRF9PRl9WSUVXLkRJQUdPTkFMO1xyXG4gICAgcHJpdmF0ZSBiYWNrZ3JvdW5kRW5hYmxlZDogYm9vbGVhbiA9IHRydWU7IC8vIERldGVybWluZXMgd2hldGhlciBvciBub3QgdGhlIGJhY2tncm91bmQgb2YgdGhpcyBjYW1lcmEgd2lsbCBiZSByZW5kZXJlZC5cclxuICAgIC8vIFRPRE86IGV4YW1pbmUsIGlmIGJhY2tncm91bmQgc2hvdWxkIGJlIGFuIGF0dHJpYnV0ZSBvZiBDYW1lcmEgb3IgVmlld3BvcnRcclxuXHJcbiAgICBwdWJsaWMgZ2V0UHJvamVjdGlvbigpOiBQUk9KRUNUSU9OIHtcclxuICAgICAgcmV0dXJuIHRoaXMucHJvamVjdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0QmFja2dyb3VuZEVuYWJsZWQoKTogYm9vbGVhbiB7XHJcbiAgICAgIHJldHVybiB0aGlzLmJhY2tncm91bmRFbmFibGVkO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRBc3BlY3QoKTogbnVtYmVyIHtcclxuICAgICAgcmV0dXJuIHRoaXMuYXNwZWN0UmF0aW87XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldEZpZWxkT2ZWaWV3KCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLmZpZWxkT2ZWaWV3O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXREaXJlY3Rpb24oKTogRklFTERfT0ZfVklFVyB7XHJcbiAgICAgIHJldHVybiB0aGlzLmRpcmVjdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHVybnMgdGhlIG11bHRpcGxpa2F0aW9uIG9mIHRoZSB3b3JsZHRyYW5zZm9ybWF0aW9uIG9mIHRoZSBjYW1lcmEgY29udGFpbmVyIHdpdGggdGhlIHByb2plY3Rpb24gbWF0cml4XHJcbiAgICAgKiBAcmV0dXJucyB0aGUgd29ybGQtcHJvamVjdGlvbi1tYXRyaXhcclxuICAgICAqL1xyXG4gICAgcHVibGljIGdldCBWaWV3UHJvamVjdGlvbk1hdHJpeCgpOiBNYXRyaXg0eDQge1xyXG4gICAgICAvL1RPRE86IG9wdGltaXplLCBubyBuZWVkIHRvIHJlY2FsY3VsYXRlIGlmIG5laXRoZXIgbXR4V29ybGQgbm9yIHBpdm90IGhhdmUgY2hhbmdlZFxyXG4gICAgICBsZXQgbXR4Q2FtZXJhOiBNYXRyaXg0eDQgPSB0aGlzLnBpdm90O1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIG10eENhbWVyYSA9IE1hdHJpeDR4NC5NVUxUSVBMSUNBVElPTih0aGlzLmdldENvbnRhaW5lcigpLm10eFdvcmxkLCB0aGlzLnBpdm90KTtcclxuICAgICAgfSBjYXRjaCAoX2Vycm9yKSB7XHJcbiAgICAgICAgLy8gbm8gY29udGFpbmVyIG5vZGUgb3Igbm8gd29ybGQgdHJhbnNmb3JtYXRpb24gZm91bmQgLT4gY29udGludWUgd2l0aCBwaXZvdCBvbmx5XHJcbiAgICAgIH1cclxuICAgICAgbGV0IG10eFdvcmxkUHJvamVjdGlvbjogTWF0cml4NHg0ID0gTWF0cml4NHg0LklOVkVSU0lPTihtdHhDYW1lcmEpO1xyXG4gICAgICBtdHhXb3JsZFByb2plY3Rpb24gPSBNYXRyaXg0eDQuTVVMVElQTElDQVRJT04odGhpcy50cmFuc2Zvcm0sIG10eFdvcmxkUHJvamVjdGlvbik7XHJcbiAgICAgIHJldHVybiBtdHhXb3JsZFByb2plY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZXQgdGhlIGNhbWVyYSB0byBwZXJzcGVjdGl2ZSBwcm9qZWN0aW9uLiBUaGUgd29ybGQgb3JpZ2luIGlzIGluIHRoZSBjZW50ZXIgb2YgdGhlIGNhbnZhc2VsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0gX2FzcGVjdCBUaGUgYXNwZWN0IHJhdGlvIGJldHdlZW4gd2lkdGggYW5kIGhlaWdodCBvZiBwcm9qZWN0aW9uc3BhY2UuKERlZmF1bHQgPSBjYW52YXMuY2xpZW50V2lkdGggLyBjYW52YXMuQ2xpZW50SGVpZ2h0KVxyXG4gICAgICogQHBhcmFtIF9maWVsZE9mVmlldyBUaGUgZmllbGQgb2YgdmlldyBpbiBEZWdyZWVzLiAoRGVmYXVsdCA9IDQ1KVxyXG4gICAgICogQHBhcmFtIF9kaXJlY3Rpb24gVGhlIHBsYW5lIG9uIHdoaWNoIHRoZSBmaWVsZE9mVmlldy1BbmdsZSBpcyBnaXZlbiBcclxuICAgICAqL1xyXG4gICAgcHVibGljIHByb2plY3RDZW50cmFsKF9hc3BlY3Q6IG51bWJlciA9IHRoaXMuYXNwZWN0UmF0aW8sIF9maWVsZE9mVmlldzogbnVtYmVyID0gdGhpcy5maWVsZE9mVmlldywgX2RpcmVjdGlvbjogRklFTERfT0ZfVklFVyA9IHRoaXMuZGlyZWN0aW9uKTogdm9pZCB7XHJcbiAgICAgIHRoaXMuYXNwZWN0UmF0aW8gPSBfYXNwZWN0O1xyXG4gICAgICB0aGlzLmZpZWxkT2ZWaWV3ID0gX2ZpZWxkT2ZWaWV3O1xyXG4gICAgICB0aGlzLmRpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgIHRoaXMucHJvamVjdGlvbiA9IFBST0pFQ1RJT04uQ0VOVFJBTDtcclxuICAgICAgdGhpcy50cmFuc2Zvcm0gPSBNYXRyaXg0eDQuUFJPSkVDVElPTl9DRU5UUkFMKF9hc3BlY3QsIHRoaXMuZmllbGRPZlZpZXcsIDEsIDIwMDAsIHRoaXMuZGlyZWN0aW9uKTsgLy8gVE9ETzogcmVtb3ZlIG1hZ2ljIG51bWJlcnNcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogU2V0IHRoZSBjYW1lcmEgdG8gb3J0aG9ncmFwaGljIHByb2plY3Rpb24uIFRoZSBvcmlnaW4gaXMgaW4gdGhlIHRvcCBsZWZ0IGNvcm5lciBvZiB0aGUgY2FudmFzLlxyXG4gICAgICogQHBhcmFtIF9sZWZ0IFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyBsZWZ0IGJvcmRlci4gKERlZmF1bHQgPSAwKVxyXG4gICAgICogQHBhcmFtIF9yaWdodCBUaGUgcG9zaXRpb252YWx1ZSBvZiB0aGUgcHJvamVjdGlvbnNwYWNlJ3MgcmlnaHQgYm9yZGVyLiAoRGVmYXVsdCA9IGNhbnZhcy5jbGllbnRXaWR0aClcclxuICAgICAqIEBwYXJhbSBfYm90dG9tIFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyBib3R0b20gYm9yZGVyLihEZWZhdWx0ID0gY2FudmFzLmNsaWVudEhlaWdodClcclxuICAgICAqIEBwYXJhbSBfdG9wIFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyB0b3AgYm9yZGVyLihEZWZhdWx0ID0gMClcclxuICAgICAqL1xyXG4gICAgcHVibGljIHByb2plY3RPcnRob2dyYXBoaWMoX2xlZnQ6IG51bWJlciA9IDAsIF9yaWdodDogbnVtYmVyID0gUmVuZGVyTWFuYWdlci5nZXRDYW52YXMoKS5jbGllbnRXaWR0aCwgX2JvdHRvbTogbnVtYmVyID0gUmVuZGVyTWFuYWdlci5nZXRDYW52YXMoKS5jbGllbnRIZWlnaHQsIF90b3A6IG51bWJlciA9IDApOiB2b2lkIHtcclxuICAgICAgdGhpcy5wcm9qZWN0aW9uID0gUFJPSkVDVElPTi5PUlRIT0dSQVBISUM7XHJcbiAgICAgIHRoaXMudHJhbnNmb3JtID0gTWF0cml4NHg0LlBST0pFQ1RJT05fT1JUSE9HUkFQSElDKF9sZWZ0LCBfcmlnaHQsIF9ib3R0b20sIF90b3AsIDQwMCwgLTQwMCk7IC8vIFRPRE86IGV4YW1pbmUgbWFnaWMgbnVtYmVycyFcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHVybiB0aGUgY2FsY3VsYXRlZCBub3JtZWQgZGltZW5zaW9uIG9mIHRoZSBwcm9qZWN0aW9uIHN1cmZhY2UsIHRoYXQgaXMgaW4gdGhlIGh5cG90aGV0aWNhbCBkaXN0YW5jZSBvZiAxIHRvIHRoZSBjYW1lcmFcclxuICAgICAqL1xyXG4gICAgcHVibGljIGdldFByb2plY3Rpb25SZWN0YW5nbGUoKTogUmVjdGFuZ2xlIHtcclxuICAgICAgbGV0IHRhbkZvdjogbnVtYmVyID0gTWF0aC50YW4oTWF0aC5QSSAqIHRoaXMuZmllbGRPZlZpZXcgLyAzNjApOyAvLyBIYWxmIG9mIHRoZSBhbmdsZSwgdG8gY2FsY3VsYXRlIGRpbWVuc2lvbiBmcm9tIHRoZSBjZW50ZXIgLT4gcmlnaHQgYW5nbGVcclxuICAgICAgbGV0IHRhbkhvcml6b250YWw6IG51bWJlciA9IDA7XHJcbiAgICAgIGxldCB0YW5WZXJ0aWNhbDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgIGlmICh0aGlzLmRpcmVjdGlvbiA9PSBGSUVMRF9PRl9WSUVXLkRJQUdPTkFMKSB7XHJcbiAgICAgICAgbGV0IGFzcGVjdDogbnVtYmVyID0gTWF0aC5zcXJ0KHRoaXMuYXNwZWN0UmF0aW8pO1xyXG4gICAgICAgIHRhbkhvcml6b250YWwgPSB0YW5Gb3YgKiBhc3BlY3Q7XHJcbiAgICAgICAgdGFuVmVydGljYWwgPSB0YW5Gb3YgLyBhc3BlY3Q7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAodGhpcy5kaXJlY3Rpb24gPT0gRklFTERfT0ZfVklFVy5WRVJUSUNBTCkge1xyXG4gICAgICAgIHRhblZlcnRpY2FsID0gdGFuRm92O1xyXG4gICAgICAgIHRhbkhvcml6b250YWwgPSB0YW5WZXJ0aWNhbCAqIHRoaXMuYXNwZWN0UmF0aW87XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7Ly9GT1ZfRElSRUNUSU9OLkhPUklaT05UQUxcclxuICAgICAgICB0YW5Ib3Jpem9udGFsID0gdGFuRm92O1xyXG4gICAgICAgIHRhblZlcnRpY2FsID0gdGFuSG9yaXpvbnRhbCAvIHRoaXMuYXNwZWN0UmF0aW87XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBSZWN0YW5nbGUuR0VUKDAsIDAsIHRhbkhvcml6b250YWwgKiAyLCB0YW5WZXJ0aWNhbCAqIDIpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBwcm9qZWN0KF9wb2ludEluV29ybGRTcGFjZTogVmVjdG9yMyk6IFZlY3RvcjMge1xyXG4gICAgICBsZXQgcmVzdWx0OiBWZWN0b3IzO1xyXG4gICAgICByZXN1bHQgPSBWZWN0b3IzLlRSQU5TRk9STUFUSU9OKF9wb2ludEluV29ybGRTcGFjZSwgdGhpcy5WaWV3UHJvamVjdGlvbk1hdHJpeCk7XHJcbiAgICAgIGxldCBtOiBGbG9hdDMyQXJyYXkgPSB0aGlzLlZpZXdQcm9qZWN0aW9uTWF0cml4LmdldCgpO1xyXG4gICAgICBsZXQgdzogbnVtYmVyID0gbVszXSAqIF9wb2ludEluV29ybGRTcGFjZS54ICsgbVs3XSAqIF9wb2ludEluV29ybGRTcGFjZS55ICsgbVsxMV0gKiBfcG9pbnRJbldvcmxkU3BhY2UueiArIG1bMTVdO1xy
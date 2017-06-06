/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * Typing externs file for parsed Manifest.
 * @externs
 */

/**
 * @struct
 * @template T
 * @record
 */
function ManifestNode() {}

/** @type {!*} */
ManifestNode.prototype.raw;

/** @type {T} */
ManifestNode.prototype.value;

/** @type {string|undefined} */
ManifestNode.prototype.debugString;

/**
 * @struct
 * @record
 */
function ManifestImageValue() {}

/** @type {!ManifestNode<(string|undefined)>} */
ManifestImageValue.prototype.src;

/** @type {!ManifestNode<(string|undefined)>} */
ManifestImageValue.prototype.type;

/** @type {!ManifestNode<number>} */
ManifestImageValue.prototype.density;

/** @type {!ManifestNode<(!Array<string>|undefined)>} */
ManifestImageValue.prototype.sizes;

/**
 * @typedef {!ManifestNode<!ManifestImageValue>}
 */
var ManifestImageNode;

/**
 * @struct
 * @record
 */
function ManifestApplicationValue() {}

/** @type {!ManifestNode<(string|undefined)>} */
ManifestApplicationValue.prototype.platform;

/** @type {!ManifestNode<(string|undefined)>} */
ManifestApplicationValue.prototype.id;

/** @type {!ManifestNode<(string|undefined)>} */
ManifestApplicationValue.prototype.url;

/**
 * @typedef {!ManifestNode<!ManifestApplicationValue>}
 */
var ManifestApplicationNode;

/**
 * @struct
 * @record
 */
function Manifest() {}

/** @type {!ManifestNode<(string|undefined)>} */
Manifest.prototype.name;

/** @type {!ManifestNode<(string|undefined)>} */
Manifest.prototype.short_name;

/** @type {!ManifestNode<(string|undefined)>} */
Manifest.prototype.start_url;

/** @type {!ManifestNode<string>} */
Manifest.prototype.display;

/** @type {!ManifestNode<(string|undefined)>} */
Manifest.prototype.orientation;

/** @type {!ManifestNode<!Array<!ManifestImageNode>>} */
Manifest.prototype.icons;

/** @type {!ManifestNode<(!Array<!ManifestApplicationNode>|undefined)>} */
Manifest.prototype.related_applications;

/** @type {!ManifestNode<(boolean|undefined)>} */
Manifest.prototype.prefer_related_applications;

/** @type {!ManifestNode<(string|undefined)>} */
Manifest.prototype.theme_color;

/** @type {!ManifestNode<(string|undefined)>} */
Manifest.prototype.background_color;

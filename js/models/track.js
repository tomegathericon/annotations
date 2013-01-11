/**
 *  Copyright 2012, Entwine GmbH, Switzerland
 *  Licensed under the Educational Community License, Version 2.0
 *  (the "License"); you may not use this file except in compliance
 *  with the License. You may obtain a copy of the License at
 *
 *  http://www.osedu.org/licenses/ECL-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an "AS IS"
 *  BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 *  or implied. See the License for the specific language governing
 *  permissions and limitations under the License.
 *
 */

/**
 * A module representing the track model
 * @module models-track
 * @requires jQuery
 * @requires collections/annotations
 * @requires collections/scales
 * @requires ACCESS
 * @requires underscore
 * @requires backbone
 */ 
define(["jquery",
        "collections/annotations",
        "access",
        "backbone"],
    
    function($,Annotations,ACCESS, Backbone){

        "use strict";
        
        /**
         * @constructor
         * @see {@link http://www.backbonejs.org/#Model}
         * @memberOf module:models-track
         * @alias Track
         */
        var Track = Backbone.Model.extend({

            /** 
             * Default models value 
             * @alias module:models-video.Video#defaults
             */
            defaults: {
                access: ACCESS.PUBLIC,
                annotations: new Annotations([],this)
            },
            
            /**
             * Constructor
             * @alias module:models-track.Track#initialize
             * @param {Object} attr Object literal containing the model initialion attribute. 
             */
            initialize: function(attr){
                
                if (!attr || _.isUndefined(attr.name)) {
                    throw "'name' attribute is required";
                }

                // Check if the track has been initialized 
                if (!attr.id) {
                    // If local storage, we set the cid as id
                    if (window.annotationsTool.localStorage) {
                        attr['id'] = this.cid;
                    }
                        
                    this.toCreate = true;
                }
                
                if (attr.annotations && _.isArray(attr.annotations)) {
                    this.set({annotations: new Annotations(attr.annotations,this)});
                } else {
                    this.set({annotations: new Annotations([],this)});
                }
                
                // If localStorage used, we have to save the video at each change on the children
                if (window.annotationsTool.localStorage){
                    if (!attr.created_by) {
                        attr.created_by = annotationsTool.user.get("id");
                        attr.created_by_nickname = annotationsTool.user.get("nickname");
                    }
                }
                
                delete attr.annotations;

                if (attr.id) {
                    this.get("annotations").fetch({async:false});
                }

                if (attr.tags) {
                    attr.tags = this.parseJSONString(attr.tags);
                }
                
                // Add backbone events to the model 
                _.extend(this, Backbone.Events);
                
                this.set(attr);
            },
            
            /**
             * Parse the attribute list passed to the model
             * @alias module:models-track.Track#parse
             * @param  {Object} data Object literal containing the model attribute to parse.
             * @return {Object}  The object literal with the list of parsed model attribute.
             */
            parse: function(data) {
                var attr = data.attributes ? data.attributes : data;

                attr.created_at = attr.created_at !== null ? Date.parse(attr.created_at): null;
                attr.updated_at = attr.updated_at !== null ? Date.parse(attr.updated_at): null;
                attr.deleted_at = attr.deleted_at !== null ? Date.parse(attr.deleted_at): null;
                attr.settings = this.parseJSONString(attr.settings);

                if (annotationsTool.user.get("id") === attr.created_by) {
                    attr.isMine = true;
                } else {
                    attr.isMine = false;
                }

                if (attr.access === ACCESS.PUBLIC) {
                    attr.isPublic = true;
                } else {
                    attr.isPublic = false;
                }

                // Parse tags if present
                if (attr.tags) {
                    attr.tags = this.parseJSONString(attr.tags);
                }

                if (data.attributes) {
                    data.attributes = attr;
                } else {
                    data = attr;
                }

                return data;
            },
            
            /**
             * Validate the attribute list passed to the model
             * @alias module:models-track.Track#validate
             * @param  {Object} data Object literal containing the model attribute to validate.
             * @return {String}  If the validation failed, an error message will be returned.
             */
            validate: function(attr){

                var tmpCreated;
                
                if(attr.id){
                    if(this.get('id') != attr.id){
                        this.id = attr.id;
                        this.attributes['id'] = attr.id;
                        this.toCreate = false;
                        this.setUrl();
                        this.attributes.ready = true;
                        this.trigger('ready',this);

                        var annotations = this.get("annotations");

                        if (annotations && (annotations.length) == 0) {
                            annotations.fetch({async:false, add: true});
                        }
                    }
                }
                
                if (attr.description && !_.isString(attr.description)) {
                    return "'description' attribute must be a string";
                }
                
                if (attr.settings && _.isUndefined(this.parseJSONString(attr.settings))) {
                    return "'settings' attribute must be a string or a JSON object";
                }

                if (attr.tags && _.isUndefined(this.parseJSONString(attr.tags))) {
                    return "'tags' attribute must be a string or a JSON object";
                }
                
                if (!_.isUndefined(attr.access)) {
                    if (!_.include(ACCESS,attr.access)) {
                        return "'access' attribute is not valid.";
                    } else if(this.attributes.access !== attr.access){
                        if (attr.access === ACCESS.PUBLIC) {
                            this.attributes.isPublic = true;
                        } else {
                            this.attributes.isPublic = false;
                        }
                    }
                }
                
                if (attr.created_at){
                    if ((tmpCreated=this.get('created_at')) && tmpCreated!==attr.created_at) {
                        return "'created_at' attribute can not be modified after initialization!";
                    } else if (!_.isNumber(attr.created_at)) {
                        return "'created_at' attribute must be a number!";
                    }
                }
        
                if (attr.updated_at && !_.isNumber(attr.updated_at)) {
                        return "'updated_at' attribute must be a number!";
                }

                if (attr.deleted_at && !_.isNumber(attr.deleted_at)) {
                        return "'deleted_at' attribute must be a number!";
                }
            },
            
            /**
             * Modify the current url for the tracks collection
             * @alias module:models-track.Track#setUrl
             */
            setUrl: function() {
                if (this.attributes.annotations) {
                    this.attributes.annotations.setUrl(this);
                }
            },

            /**
             * Override the default toJSON function to ensure complete JSONing.
             * @alias module:models-track.Track#toJSON
             * @return {JSON} JSON representation of the instane
             */
            toJSON: function() {
                var json = Backbone.Model.prototype.toJSON.call(this);
                if (json.tags) {
                    json.tags = JSON.stringify(json.tags);
                }
                delete json.annotations;

                return json;
            },

            /**
             * Parse the given parameter to JSON if given as String
             * @alias module:models-track.Track#parseJSONString
             * @param  {String} parameter the parameter as String
             * @return {JSON} parameter as JSON object
             */
            parseJSONString: function(parameter) {
                if (parameter && _.isString(parameter)) {
                    try {
                        parameter = JSON.parse(parameter);
                        
                    } catch (e) {
                        console.warn("Can not parse parameter '"+parameter+"': "+e);
                        return undefined; 
                    }
                } else if (!_.isObject(parameter) || _.isFunction(parameter)) {
                    return undefined;
                }

                return parameter;
            }
        });
        
        return Track;
    
});
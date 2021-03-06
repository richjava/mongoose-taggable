var _ = require('underscore');


/**
 * Mongoose plugin
 * 
 * Adds the ability to add and remove tags to a document, and find models filtered by tags.
 * Uses safe atomic updates to avoid race conditions.
 * Meant to be used in a similar way to GitHub Issue's 'labels' feature.
 *
 * NOTE: Indexes are not applied to the tags path, because you should probably
 * use a compound index with other paths in your schema
 *
 * @param {Schema} schema
 * @param {Object} [pluginOptions]
 * @param {Array} [pluginOptions.paths] Paths/keys where tags will be stored. Default: ['tags']
 */
module.exports = function (schema, pluginOptions) {
    var DEFAULT_PATH = 'tags';
    var paths = {};
    if (pluginOptions.hasOwnProperty('paths') && Array.isArray(pluginOptions.paths)) {
        for (var i = 0; i < pluginOptions.paths.length; i++) {
            if (typeof pluginOptions.paths[i] === 'string') {
                paths[pluginOptions.paths[i]] = [String];
            } else {
                paths[DEFAULT_PATH] = [String];
                break;
            }
        }
    } else {
        paths[DEFAULT_PATH] = [String];
    }
    //Add paths to schema
    schema.add(paths);


    /**
     * Add a tag
     * 
     * If a callback is passed, the change is made on the database (atomically).
     *
     * If no callback is passed, the change is made on the local (in memory) instance
     * of the model. The model must be saved afterwards in order to persist to the DB.
     *
     * @param {String} tag      The tag value to add
     * @param {String} [path]   Optional. The property name of the model where the tags will be stored
     * @param {Function} [cb]   Optional. Callback(err, addedTag)  addedTag will be false if tag already existed; true if added
     * @return {Boolean}        If no callback is passed: False if tag already existed; true if added
     */
    schema.methods.addTag = function (tag, path, cb) {
        if (arguments.length === 2) { // if only two arguments were supplied
            if (Object.prototype.toString.call(path) == "[object Function]") {
                cb = path;
                path = DEFAULT_PATH;
            } else {
                path = path || DEFAULT_PATH;
            }
        }else{
            path = path || DEFAULT_PATH;
        }
        if (cb) {
            addTag_async(this, tag, path, cb);
        } else { //tag
            return addTag_sync(this, tag, path);
        }
    };


    /**
     * Remove a tag
     * 
     * If a callback is passed, the change is made on the database (atomically).
     *
     * If no callback is passed, the change is made on the local (in memory) instance
     * of the model. The model must be saved afterwards in order to persist to the DB.
     *
     * @param {String} tag      The tag to remove
     * @param {String} [path]   Optional. The property name of the model where the tags will be stored
     * @param {Function} [cb]   Optional. Callback(err, removedTag)  removedTag will be false if tag didn't exist; true if removed
     * @return {Boolean}        If no callback is passed: False if tag didn't exist; true if removed
     */
    schema.methods.removeTag = function (tag, path, cb) {
        if (arguments.length === 2) { // if only two arguments were supplied
            if (Object.prototype.toString.call(path) == "[object Function]") {
                cb = path;
                path = DEFAULT_PATH;
            } else {
                path = path || DEFAULT_PATH;
            }
        }else{
            path = path || DEFAULT_PATH;
        }
        if (cb) {
            removeTag_async(this, tag, path, cb);
        } else { //tag
            return removeTag_sync(this, path, tag);
        }
    };


    /**
     * Returns whether the document as a given tag 
     * @param {String} tag      The tag to find.
     * @param {String} [path]   Optional. The property name of the model where the tags will be stored
     * @return {Boolean}
     */
    schema.methods.hasTag = function (tag, path) {
        path = path || DEFAULT_PATH;
        var tags = this[path];

        return _.contains(tags, tag);
    };


    /**
     * Alters a query to filter by tags.
     *
     * @param {Query} query           Mongoose query object
     * @param {String[]} includeTags  Tags the document must have
     * @param {String[]} excludeTags  Tags the document must NOT have
     * @param {String} [path]         Optional. The property name of the model where the tags will be stored
     *
     * @return {Query}
     */
    schema.statics.filterByTags = function (query, includeTags, excludeTags, path) {
        if (arguments.length === 3) { // if only three arguments were supplied
            if (typeof excludeTags === 'string'){
                path = excludeTags;
            } else {
                path = DEFAULT_PATH;
            }
        }else{
            path = path || DEFAULT_PATH;
        }
        var conditions = [];

        //includeTags
        if (includeTags && includeTags.length) {
            var includeCondition = {};

            includeCondition[path] = {$all: includeTags}

            conditions.push(includeCondition);
        }

        //excludeTags
        if (excludeTags && excludeTags.length) {
            var excludeCondition = {};

            excludeCondition[path] = {
                $not: {
                    $in: excludeTags
                }
            }

            conditions.push(excludeCondition);
        }

        //Add to query
        if (conditions.length) {
            query.and(conditions);
        }

        return query;
    }

    //=====================================================================

    //PRIVATE FUNCTIONS

    /**
     * Add a tag to a document atomically on the database (async)
     * 
     * NOTE: This method modifies the document on the database
     *
     * @param {Model} self      The model instance
     * @param {String} tag      The tag to add
     * @param {String} [path]   Optional. The property name of the model where the tags will be stored
     * @param {Function} cb     Optional. Callback(err, addedTag)  addedTag will be false if tag already existed; true if added
     */
    function addTag_async(self, tag, path, cb) {

        //Find the doc  to update if it doesn't have the tag
        var conditions = {};
        conditions._id = self._id;
        conditions[path] = {$ne: tag};

        //Add the tag to the model
        var update = {};
        update.$push = {};
        update.$push[path] = tag;

        self.constructor.update(conditions, update, function (err, numDocsChanged) {
            if (err)
                return cb(err);

            var addedTag = numDocsChanged ? true : false;

            //Add to the local (this) instance
            if (addedTag)
                self[path].push(tag);

            cb(null, addedTag);
        });
    }


    /**
     * Add a tag to a document in memory only (sync)
     *
     * @param {Model} self      The model instance
     * @param {String} tag      The tag to add
     * @param {String} [path]   Optional. The property name of the model where the tags will be stored
     * @return {Boolean}        False if tag already existed; true if added
     */
    function addTag_sync(self, tag, path) {

        var alreadyExists = _.contains(self[path], tag);

        if (alreadyExists) {
            return false;
        } else {
            //Add the tag
            self[path].push(tag);

            return true;
        }
    }


    /**
     * Remove a tag from a document atomically on the database (async)
     * 
     * NOTE: This method modifies the document on the database
     *
     * @param {Model} self      The model instance
     * @param {String} tag      The tag to add
     * @param {String} [path]   Optional. The property name of the model where the tags will be stored
     * @param {Function} [cb]   Optional. Callback(err, removedTag)  removedTag will be false if tag didn't exist; true if removed
     */
    function removeTag_async(self, tag, path, cb) {

        //Find the doc  to update if it doesn't have the tag
        var conditions = {};
        conditions._id = self._id;
        conditions[path] = tag;

        //Remove the tag from the model
        var update = {};
        update.$pull = {};
        update.$pull[path] = tag;

        self.constructor.update(conditions, update, function (err, numDocsChanged) {
            if (err)
                return cb(err);

            var removedTag = numDocsChanged ? true : false;

            //Remove from the local (this) instance
            if (removedTag)
                self[path].splice(self[path].indexOf(tag), 1);

            cb(null, removedTag);
        });
    }


    /**
     * Remove a tag from the model in memory only (sync)
     *
     * @param {Model} self      The model instance
     * @param {String} tag      The tag to add
     * @param {String} [path]   Optional. The property name of the model where the tags will be stored
     * @return {Boolean}        False if tag didn't exist; true if removed
     */
    function removeTag_sync(self, tag, path) {

        var alreadyExists = _.contains(self[path], tag);

        if (!alreadyExists) {
            return false;
        } else {
            //Remove the tag
            var index = self[path].indexOf(tag);

            self[path].splice(index, 1);

            return true;
        }
    }
};

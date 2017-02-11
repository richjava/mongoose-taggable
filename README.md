#mongoose-taggable

Forked from [here](https://github.com/powmedia/mongoose-taggable) and the original 
[here](https://github.com/aaronfrey/mongoose-taggable). Extended to allow support for 
multiple tags.

A simple tagging plugin for Mongoose

Adds the ability to add and remove tags to a document, and find models filtered by tags.
Uses safe atomic updates to avoid race conditions.

NOTE: Indexes are not applied to the tags path, because you should probably
use a compound index with other paths in your schema



##Set up
In your model, require mongoose-taggable:
```
taggable = require('mongoose-taggable')
```

Then add the plugin to your model. You can add any number of tags using the "path" property of the pluginOptions object. In the example below, two tags will be added to the CourseSchema model, one called "tags" and the other called "prerequisites".
```
var CourseSchema = new Schema({
});
CourseSchema.plugin(taggable, { paths: ['tags','prerequisites'] });
mongoose.model('Course', CourseSchema);
```

##API

###model.addTag(tag)
Add a tag (in memory only)

- @param {String} tag     The tag to add

- @return {Boolean}       False if tag already existed; true if added


###model.addTag(path, tag, cb)
Add a tag to a document atomically

NOTE: This method modifies the document on the database

- @param {String} tag    The tag to add
- @param {String} [path]   Optional. The property name of the model where the tags will be stored
- @param {Function} [cb]   Optional. Callback(err, addedTag)  addedTag will be false if tag already existed; true if added


###model.removeTag(tag)
Remove a tag (in memory only)

- @param {String} tag     The tag to add
- @param {String} [path]  Optional. The property name of the model where the tags will be stored
- @return {Boolean}       False if tag didn't exist; true if removed


###model.removeTag(tag, cb)
Remove a tag from a document atomically

NOTE: This method modifies the document on the database

- @param {String} tag    The tag to remove
- @param {String} [path]   Optional. The property name of the model where the tags will be stored
- @param {Function} [cb]   Optional. Callback(err, removedTag)  removedTag will be false if tag didn't exist; true if removed


###model.hasTag(tag)
Returns whether the document as a given tag

- @param {String} tag
- @param {String} [path]   Optional. The property name of the model where the tags will be stored
- @return {Boolean}


###Model.filterByTags(query, includeTags, [excludeTags])
Alters a query to filter by tags.

- @param {Query} query            Mongoose query object
- @param {String[]} includeTags   Tags the document must have (must have all)
- @param {String[]} excludeTags   Tags the document must NOT have (must not have any)
- @param {String} [path]   Optional. The property name of the model where the tags will be stored



##Changelog
###v0.5.0
- Changed the way excludeTags works in filterByTags(), from an AND operation to an OR operation. The method now selects items that have ALL of the includeTags but filters out items that have ANY of the excludeTags.
- Added functionality to have multiple tags on a model.
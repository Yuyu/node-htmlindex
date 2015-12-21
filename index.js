var fs = require('fs'),
    filesize = require('filesize'),
    path = require('path'),
    dateformat = require('dateformat'),
    compare = require('alphanumeric-sort').compare,
    express = require('express'),
    https = require('https'),
    config = require('./config.json');

// Initialize the express app
var app = express();
// Setup the views directory and template engine
app.set('views', './views');
app.set('view engine', 'jade');

/*
 * Return all directories and files in a given path, sorted by directories first
 */
var getListing = function(dirPath) {
    // Grab all files and sort them
    var files = fs.readdirSync(dirPath).sort(compare);
    // Since we have to sort by directory and files manually, create some dictionaries
    var directoryEntries = [], fileEntries = [], results = [];
    // Go through all of the files
    for(var i = 0, len = files.length; i < len; i++) {
        var file = files[i];
        // Grab file stats containing size, changed date, and if it's a directory
        var stats = fs.lstatSync(path.join(dirPath, file));
        // Create a entry out of it
        var entry = {name: file, isDirectory: stats.isDirectory(), size: filesize(stats.size), date: dateformat(stats.ctime, 'yyyy-mm-dd')};
        // Sort it into our arrays
        if (stats.isDirectory()) {
            directoryEntries.push(entry);
        } else {
            fileEntries.push(entry);
        }
    }

    // Create our final result array containing directories and files
    for(var i = 0, len = directoryEntries.length; i < len; i++) {
        results.push(directoryEntries[i]);
    }
    for(var i = 0, len = fileEntries.length; i < len; i++) {
        results.push(fileEntries[i]);
    }

    // Return our concatenated results
    return results;
}

app.use(function(req, res, next) {
    // Grab the folder and/or files the user has selected
    var queryPath = decodeURI(req.url.slice(1));

    // Basic filter so the user can't break out of the base path by doing stuff like GET /.. or GET /./..
    // TODO: Make sure it works with file names containing two dots though
    if (queryPath.match(/\.{2}/)) {
        res.status(500).send('Error');
        return;
    }
    // Generate our local path
    var fullPath = path.join(config.basePath, queryPath);
    // Grab the parent directory of the queried path
    var oneUp = '/' + path.dirname(queryPath);

    // Check if the file or directory even exists
    try {
        var stats = fs.lstatSync(fullPath);
    }
    catch (e) {
        // If not, return with status code 500
        res.status(500).send('Error');
        return;
    }

    // If the queried path is a directory, generate a listing and render it
    if (stats.isDirectory()) {
        var files = getListing(fullPath);
        // Generate a url to click on for every file
        for (var i = 0, len = files.length; i < len; i++) {
            files[i].url = '/' + path.join(queryPath, files[i].name);
        }
        // Render our index template, passing it some values to display
        res.render('index', {files: files, up: oneUp, directory: '/' + queryPath});
    } else {
        // else just download cause it's a file
        res.download(fullPath);
    }
});

// Listen on the port specified in the config or 8781 by default
var server = app.listen(config.port || 8781, config.host || '127.0.0.1', function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Index now listening on %s:%s', host, port);
});

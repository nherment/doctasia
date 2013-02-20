var args = require("argsparser").parse()
var pjson = require('./package.json')

var HTMLCompiler = require("./lib/doctasia.js")

if(args.hasOwnProperty("--help") || args.hasOwnProperty("-h")) {

    printHelp()

} else {

    var theme = "deep-ocean"

    if(args["-t"]) {
        theme = args["-t"]
    }

    var outPutDir = "docs_out"

    if(args["-o"]) {
        outPutDir = args["-o"]
    }

    var manifest = "documentation.json"

    if(args["-m"]) {
        manifest = args["-m"]
    }
    HTMLCompiler.compile(manifest, outPutDir, theme)

}



function printHelp() {

    var help = pjson.name + " version " + pjson.version
    help += "\n"
    help += "\n"
    help += "Usage: " + pjson.name + " [options] -o dir"
    help += "\n"
    help += "\n"
    help += "options:\n"
    help += "\n"
    help += "-m\t\t path to the manifest describing the documentation to build (default is documentation.json)"
    help += "\n"
    help += "-o\t\t the directory in which the documentation will be exported. 'docs_out' by default"
    help += "\n"
    help += "-t\t\t the theme to use. Default 'white'. Available: 'white', 'deep-ocean"
    help += "\n"
    help += "-h\t\t display this "

    console.log(help)

}

//var express = require('express');
//var app = express();
//
////app.use(express.static("lib/template/default"))
//app.use(express.static("out"))
//
//app.listen(3000);
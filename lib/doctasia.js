
var md              = require("node-markdown").Markdown
var SerialRunner    = require("serial").SerialRunner
var dust            = require("dustjs-linkedin")
var wrench          = require("wrench")
var fs              = require("fs")

function compile(manifestFilePath, outputDir) {


    var content = fs.readFileSync(manifestFilePath, 'utf8')
    var manifest

    try {
        manifest = JSON.parse(content)
    } catch(parseErr) {
        throw new Error("Could not parse content of ["+manifestFilePath+"] because it's not valid JSON. Please validate it on http://jsonlint.com/")
    }

    console.log("Retrieved manifest file ["+manifestFilePath+"]")

    for(var i = 0 ; i < manifest.pages.length ; i++) {
        var page = manifest.pages[i]

        if(!page.title) {
            throw new Error("Missing 'title' for page #"+i)
        }
        if(!page.path) {
            throw new Error("Missing 'path' for page #"+i)
        }

        var pageContent = fs.readFileSync(page.path, 'utf8')

        page.content = pageContent
        page.htmlContent = md(pageContent)
        page.menu = generateMenu(page.htmlContent)

        if(i === 0) {
            page.name = "index"
        } else {
            page.name = page.title.replace(/[^a-z0-9]/i, "_")
        }
    }

    console.log("Retrieved pages markdown")

    //console.log(JSON.stringify(manifest.pages))

    copyTemplate(outputDir)

    compilePages(outputDir, manifest, function(err) {
        if(err) {
            console.log(err)
            process.exit(1)
        } else {
            console.log("Your documentation is available in directory ["+outputDir+"]")
        }
    })

}

function compilePages(targetDir, manifest, callback) {

    // TODO: make templateDir configurable
    var templateFile = __dirname+"/template/default/index.html"
    var template = fs.readFileSync(templateFile, 'utf8')
    var compiled = dust.compile(template, "template")
    dust.loadSource(compiled)

    var runner = new SerialRunner()

    for(var i = 0 ; i < manifest.pages.length ; i++) {

    }

    for(var i = 0 ; i < manifest.pages.length ; i++) {

        var data = JSON.parse(JSON.stringify(manifest))
        data.currentPage = manifest.pages[i]

        runner.add(renderPage, targetDir, template, data)
    }

    runner.onError(function(err) {
        runner.stop() // stop further queued function from being run
        callback(err)
    })

    runner.run(function() {
        callback(undefined)
    })
}

function renderPage(targetDir, template, data, callback) {

    var generatedPage = targetDir+"/"+data.currentPage.name+".html"

    console.log("Processing page "+data.currentPage.name)
    dust.render("template", data, function(err, out) {
        if(err) {
            return callback(err)
        }

        fs.writeFileSync(generatedPage, out)

        callback(undefined)
    });
}

function generateMenu(content) {

    var r = /<h(\d)>(.+)<\/h\d>/igm
    var result = r.exec(content)

    var menu = []

    while(result !== null) {
        var menuItem = {
            label: result[2],
            level: result[1],
            original: result[0],
            id: result[2].replace(/[^a-z0-9]/i, "_")
        }

        menu.push(menuItem)

        result = r.exec(content)
    }
//    console.log(JSON.stringify(menu))

    return menu
}

function copyTemplate(targetDir) {

    if(!fs.existsSync(targetDir)) {
        console.log("Creating directory ["+targetDir+"]")
        fs.mkdirSync(targetDir)
    }

    wrench.copyDirSyncRecursive(__dirname+"/template/default", targetDir);
}

exports.compile = compile
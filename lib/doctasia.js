
var SerialRunner    = require("serial").SerialRunner
var dust            = require("dustjs-linkedin")
                      require("dustjs-helpers")
var wrench          = require("wrench")
var fs              = require("fs")

var marked = require("marked")



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

        if(!page.hasOwnProperty("menuLevel")) {
            page.menuLevel = 2
        }

        console.log("Loading page ["+page.path+"]")
        var pageContent = fs.readFileSync(page.path, 'utf8')

        page.content = pageContent
        page.htmlContent = marked.parse(pageContent)
        page.menu = generateMenu(page.htmlContent, page)

        for(var j = 0 ; j < page.menu.length ; j++) {
            var menuItem = page.menu[j]
//            var replaceString = '<h'+menuItem.level+'><a name="'+menuItem.id+'">'+menuItem.label+'</a></h'+menuItem.level+'>'
            var replaceString = '<a name="'+menuItem.id+'"></a>' + menuItem.original
            console.log("replacing ["+menuItem.original+"] with ["+replaceString+"]")
            page.htmlContent = page.htmlContent.replace(menuItem.original, replaceString)
        }

        page.htmlContent = page.htmlContent.replace('<pre>', '<pre class="prettyprint">')

        if(i === 0) {
            page.name = "index"
        } else {
            page.name = page.title.replace(/[^a-z0-9]/ig, "_")
        }
    }

    console.log("Retrieved ["+manifest.pages.length+"] pages markdown")

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

function loadTemplate() {
    // TODO: make template configurable
    var templateFile = __dirname+"/template/default/index.html"
    var template = fs.readFileSync(templateFile, 'utf8')
    var compiled = dust.compile(template, "template")
    dust.loadSource(compiled)
}

function compilePages(targetDir, manifest, callback) {

    loadTemplate()

    var runner = new SerialRunner()

    for(var i = 0 ; i < manifest.pages.length ; i++) {

        var data = JSON.parse(JSON.stringify(manifest))
        data.currentPage = manifest.pages[i]

        runner.add(renderPage, targetDir, data)
    }

    runner.onError(function(err) {
        runner.stop() // stop further queued function from being run
        callback(err)
    })

    runner.run(function() {
        callback(undefined)
    })
}

function renderPage(targetDir, data, callback) {

    var generatedPage = targetDir+"/"+data.currentPage.name+".html"

    console.log("Processing page [" + data.currentPage.title + "] > "+generatedPage)
    dust.render("template", data, function(err, out) {
        if(err) {
            return callback(err)
        }

        fs.writeFileSync(generatedPage, out)

        callback(undefined)
    })
}

function generateMenu(content, page) {

    var r = /<h(\d)>(.+)<\/h\d>/igm
    var result = r.exec(content)

    var menu = []

    while(result !== null) {

        var level = Number(result[1])

        if(level <= page.menuLevel) {

            var menuItem = {
                label: result[2],
                level: level,
                original: result[0],
                id: result[2].replace(/[^a-z0-9]/ig, "_")
            }

            menu.push(menuItem)
        }

        result = r.exec(content)
    }

    return menu
}

function copyTemplate(targetDir) {

    if(!fs.existsSync(targetDir)) {
        console.log("Creating directory ["+targetDir+"]")
        fs.mkdirSync(targetDir)
    }

    wrench.copyDirSyncRecursive(__dirname+"/template/default", targetDir)
}

exports.compile = compile
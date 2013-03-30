
var SerialRunner    = require("serial").SerialRunner
var dust            = require("dustjs-linkedin")
                      require("dustjs-helpers")
var wrench          = require("wrench")
var path            = require("path")
var fs              = require("fs")

var marked = require("marked")



function compile(manifestFilePath, outputDir, theme) {

    var content = fs.readFileSync(manifestFilePath, 'utf8')

    var manifest

    try {
        manifest = JSON.parse(content)
    } catch(parseErr) {
        throw new Error("Could not parse content of ["+manifestFilePath+"] because it's not valid JSON. Please validate it on http://jsonlint.com/")
    }

    console.log("Retrieved manifest file ["+manifestFilePath+"]")

    if(!manifest.prettify) {
        console.log("Prettify theme set to default because it is no in your manifest.")
        manifest.prettify = "default"
    }

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

        var lastIndex = 0

        for(var j = 0 ; j < page.menu.length ; j++) {
            var menuItem = page.menu[j]
//            var replaceString = '<h'+menuItem.level+'><a name="'+menuItem.id+'">'+menuItem.label+'</a></h'+menuItem.level+'>'
            var replaceString = '<a name="'+menuItem.id+'"></a>' + menuItem.original
            console.log("replacing ["+menuItem.original+"] with ["+replaceString+"]")
            var index = page.htmlContent.indexOf(menuItem.original, lastIndex);

            if(index !== -1) {

                page.htmlContent = page.htmlContent.substring(0, index) + replaceString + page.htmlContent.substring(index + menuItem.original.length, page.htmlContent.length)

                lastIndex = index;
            }
        }

        page.htmlContent = page.htmlContent.replace(/<pre><code/gi, '<pre class="prettyprint"><code')

        if(i === 0) {
            page.name = "index"
        } else {
            page.name = page.title.replace(/[^a-z0-9]/ig, "_")
        }



        if(manifest.sections) {
            for(var j = 0 ; j < manifest.sections.length ; j++) {
                var section = manifest.sections[j]

                if(section.title === page.section) {

                    console.log("** Adding page ["+page.title+"] to section ["+section.title+"]")

                    if(!section.pages) {
                        section.pages = []
                    }

                    section.pages.push(page)
                    break

                }
            }
        }
    }

    console.log("Retrieved ["+manifest.pages.length+"] pages markdown")

    //console.log(JSON.stringify(manifest.pages))

    copyTemplate(outputDir, theme)

    copyAssets(manifest, path.dirname(manifestFilePath), outputDir)

    compilePages(outputDir, manifest, theme, function(err) {
        if(err) {
            console.log(err)
            process.exit(1)
        } else {
            console.log("Your documentation is available in directory ["+outputDir+"]")
        }
    })

}

function copyAssets(manifest, sourceDir, outputDir) {

    if(manifest.assets) {

        var assetsDir = outputDir+"/assets/"
        if(!fs.existsSync(assetsDir)) {
            console.log("Creating directory ["+assetsDir+"]")
            fs.mkdirSync(assetsDir)
        }

        for(var i = 0 ; i < manifest.assets.length ; i++) {
            var asset = manifest.assets[i]
            wrench.copyDirSyncRecursive(process.env.PWD + "/" + asset, assetsDir)
        }
    }


    if(manifest.favicon) {

        var faviconFileName = path.basename(manifest.favicon)

        manifest.faviconUrl = faviconFileName

        console.log("Copying favicon from ["+manifest.favicon+"] to ["+outputDir+"/"+faviconFileName+"]")
        fs.createReadStream(manifest.favicon).pipe(fs.createWriteStream(outputDir+'/'+faviconFileName))
    }
}

function loadTemplate(theme) {
    // TODO: make template configurable
    var templateFile = __dirname+"/template/"+theme+"/index.html"
    var template = fs.readFileSync(templateFile, 'utf8')
    var compiled = dust.compile(template, "template")
    dust.loadSource(compiled)
}

function compilePages(targetDir, manifest, theme, callback) {

    loadTemplate(theme)

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

    var reservedMenuIds = {}
    var count = 1;

    while(result !== null) {

        var level = Number(result[1])

        if(level <= page.menuLevel) {

            var menuItem = {
                label: result[2],
                level: level,
                original: result[0]
            }

            var menuId = result[2].replace(/[^a-z0-9]/ig, "_")
            if(reservedMenuIds.hasOwnProperty(menuId)) {
                reservedMenuIds[menuId] ++
                menuId = menuId + "_" + reservedMenuIds[menuId]
            } else {
                reservedMenuIds[menuId] = 0
            }

            menuItem.id = menuId

            menu.push(menuItem)
        }

        result = r.exec(content)
    }

    return menu
}

function copyTemplate(targetDir, theme) {

    if(!fs.existsSync(targetDir)) {
        console.log("Creating directory ["+targetDir+"]")
        fs.mkdirSync(targetDir)
    }

    wrench.copyDirSyncRecursive(__dirname+"/template/"+theme, targetDir)
}

exports.compile = compile
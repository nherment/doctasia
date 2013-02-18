**Doctasia** is a straightforward static website generator for Markdown documentation.

# Features
- multi pages
- customizable style
- hassle free

# Quick start

```
  npm install -g doctasia
  doctasia
```

# Configuration

You can configure how Doctasia generates your documentation with a manifest file.
By default doctasia looks for a file named `documentation.json` in the `cwd`. All paths are relative to the `cwd`

```
{
    "title": "Doctasia", /* the website title */
    "pages": [
        {
            "title": "Home", /* the name given to the page */
            "path": "README.md", /* that path to the markdown file for thid page's content */
            "menuLevel": 3 /* how many menu levels should this page's menu contain */
        },
        {
            "title": "Example",
            "path": "EXAMPLE.md",
            "menuLevel": 5
        }, {
            "title": "License",
            "path": "LICENSE.md",
            "menuLevel": 0 /* no left menu will be displayed */
        }
    ]
}
```

# In the pipeline
- color highlighting of code snippets
- better UI
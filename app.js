const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const body_parser = require("body-parser");
const path = require("path");
const fs = require("fs");
const app = express();
const axios = require("axios");
const moment = require("moment");

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(cors({ origin: true, credentials: true }));
app.use(
    morgan(
        ":remote-addr :remote-user :user-agent :method :url HTTP/:http-version :status :res[content-length] - :response-time ms"
    )
);
app.use(body_parser.json({ limit: "500mb" }));
app.use(body_parser.urlencoded({ extended: false, limit: "50mb" }));
// app.use('/api/', routes);
app.use("/", express.static("project"));
app.use("/download", express.static("download"));
app.use("/refresh", function (req, res) {
    createIndex("./project");
    // res.redirect('/');
    res.send('ok. <br/> <a href="/">project</a>');
});
app.get("/downloadZip/:link", async (req, res) => {
    try {
        let linkGit = req.params.link || "";
        linkGit = linkGit.trim().replace(/\+/g, "/");
        await downloadFile(
            linkGit,
            `./download/${linkGit.split("/")[4]}_${new Date().getTime()}.zip`
        );
        updateFile();
        res.redirect(`/download`);
    } catch (err) {
        console.log(err);
        res.send("Lỗi gì đó: " + err.message);
    }
});
app.get("/delete/:file", (req, res) => {
    try {
        let file = req.params.file;
        fs.unlinkSync(`./download/${file}`);
        updateFile();
        res.redirect(`/download`);
    } catch (err) {
        console.log(err);
        res.send("Lỗi gì đó: " + err.message);
    }
});
function createIndex(folderPath) {
    try {
        let files = fs.readdirSync(folderPath);
        for (let file of files) {
            if (!file.includes(".") && file != "node_modules") {
                createIndex(`${folderPath}/${file}`);
            }
        }
        let html = files
            .filter((item) => item != "index.html")
            .map((item) => `<a href='./${item}'>${item}</a> <br/>`)
            .join("\n");
        fs.writeFileSync(`${folderPath}/index.html`, html);
    } catch (err) {}
}

async function downloadFile(fileUrl, outputLocationPath) {
    const writer = fs.createWriteStream(outputLocationPath);
    return axios({
        method: "get",
        url: fileUrl,
        responseType: "stream",
    }).then((response) => {
        //ensure that the user can call `then()` only when the file has
        //been downloaded entirely.

        return new Promise((resolve, reject) => {
            response.data.pipe(writer);
            let error = null;
            writer.on("error", (err) => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on("close", () => {
                if (!error) {
                    resolve(true);
                }
                //no need to call the reject here, as it will have been called in the
                //'error' stream;
            });
        });
    });
}
function updateFile() {
    let index1 = fs.readFileSync("./download/index1.txt");
    let index2 = fs.readFileSync("./download/index2.txt");
    let files = fs.readdirSync("./download");
    files = files
        .filter(
            (item) =>
                item != "index.html" &&
                item != "index1.txt" &&
                item != "index2.txt"
        )
        .map(
            (item) =>
                `<div style='margin-top: 5px'>
                        <a href='./${item}'>${item}</a>
                        <a href='/delete/${item}' style='color:red'>Xóa</a>
                    </div>
                    <br/>`
        )
        .join("\n");
    let fileIndex = index1 + files + index2;
    fs.writeFileSync("./download/index.html", fileIndex);
}
app.listen(8080, () => {
    console.log(`\nStart server at: ${new Date()}
                HTTP server is listening at: ${"localhost"}:${"8080"}
    `);
});

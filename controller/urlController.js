
const urlModel = require('../model/model.js')
const shortId = require('short-id')
const redis = require("redis");
const validator = require("../validations/validator.js");
const { promisify } = require("util");

let validUrl = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/

//Connect to redis
const redisClient = redis.createClient(
    12137,
    "redis-12137.c264.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }

);
redisClient.auth("5rEvs5tg0TquJbpbSt2tD2ZSPhl2RMjE", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//Connection setup for redis
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient)



// ===========================================================================create url========================================================

const createUrl = async function (req, res) {
    try {
        let longUrl = req.body.longUrl

        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, msg: "please enter a link as a value" })
        }
        if (!validUrl.test(longUrl)) {
            return res.status(404).send({ status: false, msg: "please enter a valid url" })
        }
        let cacheData = await GET_ASYNC(`${longUrl}`)

        if (cacheData) {
            let cacheUrlData = JSON.parse(cacheData)
            data = {
                longUrl: cacheUrlData.longUrl,
                shortUrl: cacheUrlData.shortUrl,
                urlCode: cacheUrlData.urlCode
            }
            return res.status(201).send({ status: true, message: "url already exist", data: data })
        } else {
            let urlCode = shortId.generate().toLowerCase()

            let shortUrl = "http://localhost:3000/" + urlCode

            let savedData = { longUrl, shortUrl, urlCode }
            let saveUrl = await urlModel.create(savedData)
            result = {
                longUrl: saveUrl.longUrl,
                shortUrl: saveUrl.shortUrl,
                urlCode: saveUrl.urlCode
            }
            await SET_ASYNC(`${longUrl}`, JSON.stringify(result))
            return res.status(201).send({ status: true, msg: "succesfully generated", data: result })
        }
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}



// ========================================================= get url ===============================================================================

const getUrl = async function (req, res) {

    try {
        const urlCode = req.params.urlCode;

        let cacheUrlcode = await GET_ASYNC(`${urlCode}`); 

        let value = JSON.parse(cacheUrlcode)

        if (value) {
            return res.status(302).redirect(value.longUrl);
        }
        else {
            const data = await urlModel.findOne({ urlCode: urlCode })

            if (!data) {
                return res.status(404).send({ status: false, msg: "Url Not Found." })
            }
            await SET_ASYNC(`${urlCode}`, JSON.stringify(data));
            return res.status(302).redirect(data.longUrl)
        }
    }
    catch (err) {
        res.status(500).send({ msg: err.message })
    }
}
module.exports = { createUrl, getUrl }
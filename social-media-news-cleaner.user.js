// ==UserScript==
// @name         social-media-news-cleaner
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Cleans the news sites from the social media posts (for now, only cleans mamul.am from facebook and telegram posts)
// @author       https://github.com/arturhg/
// @match        https://mamul.am/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mamul.am
// @grant        none
// @noframes
// ==/UserScript==

async function containsSocialMediaSource(url) {

    if (!(url.includes('news/') && !url.includes('sdk'))) {
        return Promise.resolve(false);
    }

    const entry = getWithTtl(url);
    if (entry != null) {
        return Promise.resolve(entry === true);
    }

    return fetch(url)
        .then(x => x.text())
        .then(function (html) {

            const link = new DOMParser()
                .parseFromString(html, "text/html")
                .querySelector('.w3 > a')?.href;

            if (link === undefined) {
                setWithTtlInDays(url, false, 1);
                return false;
            }

            const isSocialMediaSource = link?.includes('t.me/') || link?.includes('facebook.com/');
            setWithTtlInDays(url, isSocialMediaSource, 1);
            return isSocialMediaSource;
        });
}

Array.prototype.asyncFilter = async function (f) {
    const array = this;
    const booleans = await Promise.all(array.map(f));
    return array.filter((x, i) => booleans[i]);
}


function getNodesToRemove(newsLink) {

    const link = newsLink?.parentNode;
    const date = link?.previousSibling;
    const under = link.nextSibling;
    const picture = date?.previousSibling;

    const nodeArray = new Array(4);
    nodeArray[0] = picture;
    nodeArray[1] = date;
    nodeArray[2] = link;
    nodeArray[3] = under;
    return nodeArray;
}

function setWithTtlInDays(key, value, ttlInDays) {
    setWithTtlInSeconds(key, value, ttlInDays * 24 * 60 * 60)
}

function setWithTtlInSeconds(key, value, ttlInSeconds) {
    const now = new Date();

    const item = {
        value: value,
        expiry: now.getTime() + ttlInSeconds * 1000,
    }

    localStorage.setItem(key, JSON.stringify(item));
}

function getWithTtl(key) {
    const itemStr = localStorage.getItem(key)

    if (!itemStr) {
        return null;
    }
    const item = JSON.parse(itemStr);
    const now = new Date();

    if (now.getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    return item.value;
}

function garbageCollect() {
    for (const [key, value] of Object.entries(localStorage)) {
        if (!value) {
            continue;
        }

        try {
            const item = JSON.parse(value);
            const now = new Date();

            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
            }
        } catch (e) {
        }

    }
}

(function () {
    'use strict';

    setInterval(garbageCollect, 1000 * 60 * 60);

    [...document.querySelectorAll('div > a')]
        .asyncFilter(a => containsSocialMediaSource(a.href))
        .then(links => links.flatMap(link => getNodesToRemove(link))
            .filter(node => node !== null && node !== undefined)
            .forEach(node => node.remove()));
})();
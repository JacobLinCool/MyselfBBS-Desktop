# Unofficial MyselfBBS Desktop App

Theater-like user experience for MyselfBBS.

Actually, my goal is to design a framework for media center applications with remote access and local cache ability.

It is just the prototype of my thought.

## Screenshots

![homepage](screenshots/homepage.png)

![details](screenshots/details.png)

![search](screenshots/search.png)

## Architecture

There are 3 main parts: **Client**, **Provider**, and **Storage**.

### Client

**Client** is the frontend, which is a web application.

It should be able to be design in many ways, the only requirement is that it should be able to communicate with (multiple) **Providers**.

### Provider

**Provider** is an API server with consistent interface.

PATH: `${host}/${version}/${controller}/${action}`

* `${host}`: the hostname of the server, may not be the root
* `${version}`: the version of the API
* `${controller}`: the controller specifier

For example: `http://localhost:29620/v1/system/ready`

### Storage

**Storage** does everything related to the data.

For media files, HLS (`.m3u8`) is used because it has the ability to be extended to support live streaming.

```none

    ---------------         ---------------
    |             |         |             |
    |   Provider  |  <--->  |    Client   |
    |             |         |             |
    ---------------         ---------------
    |             |
    |   Storage   |
    |             |
    ---------------

```

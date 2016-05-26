import actions from '../actions'

const DOMAIN = window.location.origin
const PHONE_URL = DOMAIN + '/ringcentral-js-widget/build/widgets.js'
const LIB_URL = DOMAIN + '/ringcentral-js-widget/build/build.js'
const COMMON_STYLE_URL = [DOMAIN + '/ringcentral-js-widget/build/styles/main.css']
const TARGET_TAG = 'rc-phone'
const IFRAME_URL = DOMAIN + '/ringcentral-js-widget/demo/embed.html'
const useShadowDOM = false /* Always fallback to iframe for now */
const iframeReadyQueue = []
var frame

var iframeReady = false
var drag = false

var safeEval = function(script, target) {
    var tag = document.createElement('script')
    tag.text = script
    if (target) {
        target.appendChild(tag)
        // target.removeChild(tag)
    } else {
        document.body.appendChild(tag)
        document.body.removeChild(tag)
    }
}
var fetchAndEval = function(url, target) {
    return function() {
        return fetch(url)
                .then(res => res.text())
                .then(data => safeEval(data, target))
    }
}

var fetchAndEvalFramework = fetchAndEval(LIB_URL)
var fetchAndEvalWidget = fetchAndEval(PHONE_URL)

var createContainer = function() {
    var target = document.querySelector(TARGET_TAG)
    if (!target) return
    var shadow = target.createShadowRoot()
    var container = document.createElement('div')
    shadow.appendChild(container)

    COMMON_STYLE_URL.forEach(src => {
        fetch(src)
        .then(res => res.text())
        .then(style => {
            var tag = document.createElement('style')
            tag.innerHTML = style
            shadow.appendChild(tag)
        })
    })
    appendWidget(container, shadow)

    function appendStyle() {

    }

    function appendWidget(container, shadowRoot) {
        var phone = w(TARGET_TAG, {
            shadowRoot,
            data: {
                shadowRoot
            }
        })
        phone.mount(container)
    }
    return container
}

var createIframe = function() {
    var target = document.querySelector(TARGET_TAG)
    var options = getOptions(target)
    var iframe = document.createElement('iframe')

    iframe.width = parseInt(options.width) + 2 // border
    iframe.height = options.height
    iframe.style.border = 0
    iframe.src = IFRAME_URL + '?' +
                    `first-level=${options.firstLevel}&` +
                    `width=${options.width}&` +
                    `height=${options.height}&` +
                    `key=${options.key}&` +
                    `secret=${options.secret}&` +
                    `origin=${window.location.origin}`
    iframe.setAttribute('name', 'rc-iframe')
    if (options.dynamic != null) {
        target.style.display = 'none'
        iframe.style['box-shadow'] = '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)'
        clickToDial(target, iframe)
    }
    if (options.fixed != null) {
        target.style.position = 'fixed'
        target.style.top = 0
        target.style.right = '5px'
        iframe.style['box-shadow'] = '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)'
    }
    target.appendChild(iframe)
    return iframe
}

var getOptions = function(target) {
    return {
        firstLevel: target.getAttribute('first-level'),
        width: target.getAttribute('width'),
        height: target.getAttribute('height'),
        dynamic: target.getAttribute('dynamic'),
        fixed: target.getAttribute('fixed'),
        key: target.getAttribute('key'),
        secret: target.getAttribute('secret'),
    }
}

var clickToDial = function(target, iframe) {
    [...document.querySelectorAll('[data-phone]')].forEach(ele => {
        ele.style['text-decoration'] = 'underline black'
        ele.style['cursor'] = 'pointer'
        ele.addEventListener('click', e => {
            target.style.display = 'block'
            target.style.position = 'absolute'
            target.style.top = `${e.pageY + 3}px`
            target.style.left = `${e.pageX + 3}px`
            iframe.contentWindow.postMessage({
                type: actions.HOST_DIALPAD_NUMBER,
                value: ele.getAttribute('data-phone')
            }, IFRAME_URL)
            e.stopPropagation()
        })
    })
    document.addEventListener('click', e => {
        var clicked = e.target
        while (clicked.parentNode) {
            if (clicked === target) {
                return
            }
            clicked = clicked.parentNode
        }
        target.style.display = 'none'
    })
}

window.addEventListener('message', function(e) {
    if (e.data.type === 'init') {
        iframeReady = true
        iframeReadyQueue.forEach(action => action(e.source))
        iframeReadyQueue.length = 0
    }
})

if (document.body.createShadowRoot && useShadowDOM) {
    // shadow dom is supported
    // The order is important
    fetchAndEvalWidget()
    .then(fetchAndEvalFramework)
    .then(createContainer)
    .catch(e => console.error(e))
} else {
    // fallback to iframe
    frame = createIframe()
}
export default frame
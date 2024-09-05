// Authors: Nurudin Imsirovic <realnurudinimsirovic@gmail.com>
// Library: Abstraction Layer For 2D Canvas
// License: WTFPL v2 (See license.txt)
// Project: https://github.com/imshvc/framebuffer-js
// Created: 2024-05-01 08:34 PM
// Updated: 2024-09-05 02:46 AM

// Calendar Versioning (CalVer)
//
// See 1: https://calver.org/
// See 2: https://stripe.com/blog/api-versioning
// See 3: https://en.wikipedia.org/wiki/ISO_8601#Calendar_dates
const FB_VERSION_YEAR = 2024
const FB_VERSION_MONTH = 9
const FB_VERSION_DAY = 5

// Prototypes
function FBResource() {
  Object.assign(this, ...arguments)
}

function FBError(text = null, id = null) {
  this.text = text
  this.id = id
  this.created = +Date.now() // UNIX time on creation
}

function FBErrorDefinition(text = null, id = null) {
  this.text = text
  this.id = id
}

/**
 * Generate an error (or check if value is one)
 * Polymorphic function.
 * @param {String|FBError} text Error description, FBError, or FBResource object.
 * @param {String} id Error ID
 * @returns {FBError|Boolean} FBError is returned on error creation
 */
function fb_error(text = null, id = 'FB_ERR_USER_GENERATED') {
  // Error check
  if (text instanceof FBError)
    return true

  // Resource check
  if (text instanceof FBResource)
    return fb_error(text.error)

  // Built-in error check
  if (text instanceof FBErrorDefinition)
    return fb_error(text.text, text.id)

  // Not text
  if (typeof text !== 'string')
    text = ''

  // Text can be null
  if (text === null)
    text = ''

  text = text.trim()

  // ID check
  if (id instanceof FBErrorDefinition)
    id = id.id
  else if (id != 'FB_ERR_USER_GENERATED')
    id = 'FB_ERR_UNSPECIFIED'

  let error = new FBError(text, id)

  // Logging enabled
  if (fb_config('log_errors'))
    window.fb_errors.push(error)

  return error
}

/**
 * Get error value either by ID or Text
 * Internal function.
 * @param {String} value Error ID or Text
 * @returns {String|Null}
 */
function fb_error_map_value(value = null) {
  if (value === null)
    return null

  let errors = window.fb_error_ids

  if (fb_error_exists(value))
    return errors[value]

  return null
}

/**
 * Translate Error ID to Text
 * @param {String|FBError} value Error ID
 * @returns {String|Null}
 */
function fb_error_id(value = null) {
  if (value === null)
    return null

  if (value instanceof FBError)
    value = value.id

  if (value.trim().length == 0)
    return null

  // Invalid ID
  if (value.length < 7 || value.toUpperCase().substring(0, 7) !== 'FB_ERR_')
    return null

  return fb_error_map_value(value)
}

/**
 * Translate Error Text to ID
 * @param {String|FBError} value Error Text
 * @returns {String|Null}
 */
function fb_error_text(value = null) {
  if (value === null)
    return null

  if (value instanceof FBError)
    value = value.text

  if (value.trim().length == 0)
    return null

  // Passed ID instead of Text
  if (value.length >= 7 && value.toUpperCase().substring(0, 7) === 'FB_ERR_')
    return null

  return fb_error_map_value(value)
}

/**
 * Check if error definition exists.
 * Internal function.
 * @param {String|FBError} id Error ID, Description, or FBError Object
 */
function fb_error_exists(id = null) {
  if (id === null)
    return id

  if (id instanceof FBError)
    id = id.id

  return id in window.fb_error_ids
}

/**
 * List/filter Framebuffer JS functions
 * @param {String} var_args Strings to filter against function names
 * @returns {Array}
 */
function fb_list_functions(var_args) {
  let filters = [...arguments]
  let list = {}

  // for each 'key' in window
  for (let k in window) {

    // if k starts with 'fb_' and is a function
    if (k.startsWith('fb_') && typeof window[k] === 'function') {

      // filters specified, need to loop
      if (filters.length > 0) {
        for (let str of filters) {
          // function name contains 'str' from 'filters'
          if (k.includes(str))
            list[k] = 0
        }

        // continue to next filter item
        continue
      }

      // no filter specified
      list[k] = 0
    }
  }

  return Object.keys(list)
}

/**
 * Get last error that was logged
 * @returns {FBError|null}
 */
function fb_get_last_error() {
  let errors = window.fb_errors

  if (errors.length == 0)
    return null

  if (!fb_config('log_errors'))
    return null

  return errors[errors.length - 1]
}

/**
 * Clear error log
 * @returns {undefined}
 */
function fb_clear_errors() {
  window.fb_errors.length = 0
}

// Default Canvas Context Attributes
// Source: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
var fb_canvas_context_attributes = {
  // A boolean value that indicates if the canvas contains an alpha channel.
  // If set to 'false', the browser now knows that the backdrop is always opaque,
  // which can speed up drawing of transparent content and images.
  //
  // Disclaimer: When set to 'true', Certain hardware or software configurations
  // may yield diminishing returns in terms of rendering performance.
  alpha: false,

  // Specifies the color space of the rendering context.
  colorSpace: 'srgb',

  // A boolean value that hints the user agent to reduce the latency
  // by desynchronizing the canvas paint cycle from the event loop.
  desynchronized: true,

  // A boolean value that indicates whether or not a lot of read-back
  // operations are planned. This will force the use of a software
  // (instead of hardware accelerated) 2D canvas and can save memory
  // when calling 'getImageData()' frequently.
  willReadFrequently: true,
}

// Dimension constraints
//
// Disclaimer: We impose our own, but constraints are often set
// by the browser, or due to hardware limitation. This is a
// known upper limit to "work" but no guarantees it will on
// every device.
const FB_MAX_WIDTH = 32767
const FB_MAX_HEIGHT = 32767

// Color channel offsets
const FB_CHANNEL_R = 0
const FB_CHANNEL_G = 1
const FB_CHANNEL_B = 2
const FB_CHANNEL_A = 3

// Defer methods
const FB_DEFER_WRITE_THROUGH = 0
const FB_DEFER_WRITE_BACK = 1

// Error definitions - Bi-directional map
var fb_error_ids = {
  FB_ERR_UNSPECIFIED: 'unspecified error',
  FB_ERR_BAD_WIDTH: 'width less than or equal to zero (0 >= width)',
  FB_ERR_BAD_HEIGHT: 'width less than or equal to zero (0 >= height)',
  FB_ERR_LARGE_WIDTH: 'width larger than allowed size (>' + FB_MAX_WIDTH + ')',
  FB_ERR_LARGE_HEIGHT: 'height larger than allowed size (>' + FB_MAX_HEIGHT + ')',
  FB_ERR_STUB_FUNCTION: 'stub function or method',
  FB_ERR_FUNC_BLACKLISTED: 'function is blacklisted from being hooked via library methods',
  FB_ERR_BAD_CFG_KEY: 'bad configuration key',
  FB_ERR_BAD_CFG_VALUE: 'bad configuration value',
  FB_ERR_BAD_HOOK_TYPE: 'bad function hook type',
  FB_ERR_HOOK_CALL_FAILED: 'hook call failed',
  FB_ERR_CANT_LOAD: 'cannot load',
  FB_ERR_USER_GENERATED: 'user generated error',
  FB_ERR_UNHANDLED_CASE: 'unhandled case',
  FB_ERR_RES_LIST_DISABLED: 'resource list disabled by configuration',
  FB_ERR_CONVOLUTION_MATRIX_SIZE: 'convolution matrix must be of size 3x3 (9) or 5x5 (25)',
}

for (let id in fb_error_ids) {
  // opposite-direction lookup
  let text = fb_error_ids[id]

  // create an error definition to differentiate
  // between built-in and user-provided errors
  fb_error_ids[id] = new FBErrorDefinition(text, id)
  fb_error_ids[text] = fb_error_ids[id]

  // assign global variable as reference to error text
  window[id] = fb_error_ids[id]
}

/**
 * Describe error IDs to their descriptions and vice-versa
 * @param {String|FBError} id Error ID, Description, or FBError Object
 * @returns {String|null}
 */
function fb_describe_error(id = null) {
  if (id === null)
    return id

  if (id instanceof FBError)
    id = id.id

  if (!fb_error_exists(id))
    return null

  let errors = window.fb_error_ids

  // value -> key
  if (id.toUpperCase().substring(0, 7) !== 'FB_ERR_')
    return errors[errors[id]]

  // key -> value
  return errors[id]
}

// Object containing hooked functions
// See 'fb_hook()' function.
// Wiki: https://en.wikipedia.org/wiki/Hooking
var fb_hooked_functions = {}

// Blacklisted functions from hooks
var fb_hook_blacklist = [
  'fb_hook',
  'fb_hook_active',
  'fb_hook_call',
  'fb_hook_disable',
  'fb_hook_enable',
  'fb_hooked',
  'fb_unhook',
]

// References to created and/or loaded Framebuffer Resources
// Even if a resource is assigned to a variable, it's object
// should realistically be here.
var fb_resource_list = []

// Errors generated by fb_error()
// Disabled by default.  Use fb_config()
// to enable logging.
var fb_errors = []

/**
 * Add resource reference to the resource list
 * @param {FBResource} resource Framebuffer Resource
 * @returns {Boolean}
 */
function fb_resource_list_add(resource = null) {
  // Disabled by configuration
  if (!fb_config('use_resource_list'))
    return false

  if (!fb_valid(resource))
    return false

  window.fb_resource_list.push(resource)
  return true
}

/**
 * Filter created resources by their property values.
 * Multiple filters allowed. Including callbacks.
 * @param {Object|FBError}
 * @returns {Object|FBError}
 */
function fb_resource_list_filter(var_args) {
  if (!fb_config('use_resource_list'))
    return
}

// Configuration map keys accessible by 'fb_config()'
var fb_config_map_keys = [
  'alpha',
  'defer',
  'log_errors',
  'use_resource_list',
]

// Configuration map
// Disclaimer: Must be put last (before fb_create)
//
// We don't have a '_get' method.
//
// Internal functions access values inline,
// whereas for maintainability reasons user code
// should use 'fb_config()' when setting or getting
// the value.
//
// Private methods: 'parent' refers to the
// key object itself where methods and values
// reside.
//
// FIXME: Maybe just use 'this' instead of 'parent'?
// We'll see how the overall thing behaves, don't make
// assumptions beforehand.
var fb_config_map = {
  // Alpha (part of Canvas Context Attributes)
  alpha: {
    default: false,
    value: false,
    allowed: [0, 1, false, true],

    // Private methods
    _set: function(value, parent) {
      parent.value = value
      fb_canvas_context_attributes.alpha = value
    },
  },

  // Defer bit
  defer: {
    allowed: [
      FB_DEFER_WRITE_THROUGH,
      FB_DEFER_WRITE_BACK,
    ],
    default: FB_DEFER_WRITE_BACK,
    value: FB_DEFER_WRITE_BACK,

    // Private methods
    _set: function(value, parent) {
      parent.value = value
    },
  },

  // Log errors by fb_error()
  log_errors: {
    allowed: [0, 1, false, true],
    default: 0,
    value: 0,

    // Private methods
    _set: function(value, parent) {
      parent.value = value
    }
  },

  // Use 'fb_resource_list' as an array of
  // resources created throughout the script
  // lifetime
  use_resource_list: {
    allowed: [0, 1, false, true],
    default: 0,
    value: 0,

    // Private methods
    _set: function(value, parent) {
      parent.value = value
    }
  },
}

/**
 * Create a Framebuffer Resource
 * @param {Number} width Width
 * @param {Number} height Height
 * @returns {Object} Framebuffer Resource
 */
function fb_create(width = 0, height = 0) {
  // Convert to decimal
  width |= 0
  height |= 0

  let resource = new FBResource({
    canvas: null,
    width: width,
    height: height,
    context: null,
    image: null,

    // UNIX time on creation
    created: +Date.now(),

    // UNIX time on update (fb_sync call)
    updated: 0,

    // Property in use by fb_load()
    // Use it to your advantage.
    loaded: true,

    // Resource is locked. Use this to prevent accidental
    // writes to a static resource.
    //
    // Disclaimer: Code can still go rogue and set this
    // to false, but a good feature to have nonetheless.
    locked: false,

    // Dirty bit is set when pixel values have changed until
    // fb_sync() is called to synchronize the cache and main
    // memory. If you enable (write-through) aka defer = 0
    // then this synchronization procedure is automatically
    // performed.
    dirty: 0,

    // Course of action when pixel values change.
    // Default: write-back
    //
    // 1 = write-back
    //     Changes are written to temporary memory (faster)
    //     but requires fb_sync() to be called afterwards.
    //
    // 0 = write-through
    //     Synchronized automatically, has a performance hit
    //     but more intuitive as no need to call fb_sync()
    defer: fb_config_map.defer.value,

    // Error messages by internal functions.
    //
    // Please don't modify it with your code!
    //
    // One can do that to allow other code
    // relying on the value to run, though
    // unexpected results usually arise which
    // becomes more difficult to debug.
    error: null,
  })

  // Boundary checks
  if (0 >= width) {
    resource.error = fb_error(FB_ERR_BAD_WIDTH)
    return resource
  }

  if (0 >= height) {
    resource.error = fb_error(FB_ERR_BAD_HEIGHT)
    return resource
  }

  if (width > FB_MAX_WIDTH) {
    resource.error = fb_error(FB_ERR_LARGE_WIDTH)
    return resource
  }

  if (height > FB_MAX_HEIGHT) {
    resource.error = fb_error(FB_ERR_LARGE_HEIGHT)
    return resource
  }

  resource.canvas = document.createElement('canvas')
  resource.canvas.width = width
  resource.canvas.height = height

  resource.context = resource.canvas.getContext(
    '2d', fb_canvas_context_attributes
  )

  if (resource.context === null)
    throw 'Canvas is not supported on this platform'

  resource.image = new ImageData(width, height)
  resource.image.data.fill(255)

  // Synchronize
  resource.context.putImageData(resource.image, 0, 0)

  return resource
}

/**
 * Synchronize ImageData to the Canvas
 * @param {Object} var_args Framebuffer Resource(s)
 * @returns {Number} Valid resources synchronized
 */
function fb_sync(var_args) {
  let count = 0

  for (let resource of arguments) {
    if (!fb_valid(resource))
      continue

    ++count
    resource.context.putImageData(resource.image, 0, 0)
    resource.dirty = 0
    resource.updated = +Date.now()
  }

  return count
}

/**
 * Set RGB pixel color at X and Y coordinates
 * <NoDefer>
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} x X axis
 * @param {Number} y Y axis
 * @param {Number} r Red channel
 * @param {Number} g Green channel
 * @param {Number} b Blue channel
 */
function fb_set_pixel(resource = null, x, y, r, g, b) {
  if (!fb_valid(resource))
    return

  if (resource.locked)
    return

  x |= 0
  y |= 0

  let pos = resource.width * y * 4 + x * 4

  resource.image.data[pos + FB_CHANNEL_R] = r
  resource.image.data[pos + FB_CHANNEL_G] = g
  resource.image.data[pos + FB_CHANNEL_B] = b

  resource.dirty = 1
}

/**
 * Get RGB pixel color at X and Y coordinates
 * <NoDefer>
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} x X axis
 * @param {Number} y Y axis
 * @returns {(Array|undefined)}
 */
function fb_get_pixel(resource = null, x, y) {
  if (!fb_valid(resource))
    return

  x |= 0
  y |= 0

  let pos = resource.width * y * 4 + x * 4

  return [
    resource.image.data[pos + FB_CHANNEL_R],
    resource.image.data[pos + FB_CHANNEL_G],
    resource.image.data[pos + FB_CHANNEL_B],
  ]
}

/**
 * Spawn resource to a container element
 * @param {FBResource} resource Framebuffer Resource
 * @param {Element} container Element to which we spawn
 * @throws If resource or container are invalid
 */
function fb_spawn(resource = null, container = null) {
  if (!fb_valid(resource))
    throw 'fb_spawn expects resource to be a Framebuffer Resource'

  if (container === null || container instanceof Element === false)
    throw 'fb_spawn expects container to be an element (got null)'

  container.append(resource.canvas)
}

/**
 * Download resource image as file
 * @param {FBResource} resource Framebuffer Resource
 * @param {String} filename Name of saved file
 * @returns {Boolean}
 */
function fb_save(
  resource = null,
  filename = '0.png'
) {
  if (!fb_valid(resource))
    return false

  let anchor = document.createElement('a')
  anchor.href = fb_data_url(resource)
  anchor.download = filename
  anchor.click()

  return true
}

/**
 * Draw a rectangle
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} x X axis
 * @param {Number} y Y axis
 * @param {Number} w Width
 * @param {Number} h Height
 * @param {Number} r Red channel
 * @param {Number} g Green channel
 * @param {Number} b Blue channel
 * @param {Boolean} fill Fill the area with color
 * @returns {Boolean}
 */
function fb_rect(
  resource = null,
  x = 0,
  y = 0,
  w = 10,
  h = 10,
  r = 255,
  g = 255,
  b = 255,
  fill = false
) {
  if (!fb_valid(resource))
    return false

  if (fill) {
    for (let y2 = y; y2 < h + y; y2++) {
      for (let x2 = x; x2 < w + x; x2++) {
        if (resource.width > x2 && resource.height > y2) {
          fb_set_pixel(resource, x2, y2, r, g, b)
        }
      }
    }
  } else {
    let x2 = w + x
    let y2 = h + y

    // top
    fb_line(resource, x, y, x2 - 1, y, r, g, b)

    // left
    fb_line(resource, x, y, x, y2, r, g, b)

    // bottom
    fb_line(resource, x, y2 - 1, x2 - 1, y2 - 1, r, g, b)

    // right
    fb_line(resource, x2 - 1, y, x2 - 1, y2, r, g, b)
  }

  fb_defer(resource)

  return true
}

/**
 * Draw a circle
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} x X axis
 * @param {Number} y Y axis
 * @param {Number} w Width
 * @param {Number} h Height
 * @param {Number} r Red channel
 * @param {Number} g Green channel
 * @param {Number} b Blue channel
 * @param {Number} p Precision of line (clamped from 0.1 to 2) (ignored on fill)
 * @param {Boolean} fill Fill the area with color
 * @param {Boolean} center Treat X and Y coordinates as middle of the circle
 * @param {Number} angles Across what angle to plot the circle
 * @returns {Boolean}
 */
function fb_circle(
  resource = null,
  x,
  y,
  w,
  h,
  r,
  g,
  b,
  p      = 1,
  fill   = false,
  center = false,
  angles = 360
) {
  if (!fb_valid(resource))
    return false

  let radian = w / 2

  if (!fill) {
    p = 1 / p
    p = clamp(p, 0.5, 10) // clamped from 0.5 to 10
    p -= .5
  }

  // Offset from the center
  if (!center) {
    x += w / 2
    y += h / 2
  }

  w = radian / w * 2.016
  h = radian / h * 2.016

  for (let angle = 0, x1, y1; angle < angles; angle += 0.05) {
    x1 = radian * Math.cos(angle * (Math.PI / 180)) / w
    y1 = radian * Math.sin(angle * (Math.PI / 180)) / h

    if (fill) {
      fb_line(resource, x, y, x + x1, y + y1, r, g, b)
    } else {
      if (p > 0)
        angle += p

      fb_set_pixel(resource, x + x1, y + y1, r, g, b)
    }
  }

  fb_defer(resource)

  return true
}

/**
 * Draw a line from point A to point B
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} x1 X axis (point A)
 * @param {Number} y1 Y axis (point A)
 * @param {Number} x2 X axis (point B)
 * @param {Number} y2 Y axis (point B)
 * @param {Number} r Red channel
 * @param {Number} g Green channel
 * @param {Number} b Blue channel
 * @param {Number} p Precision of line (clamped from 0.1 to 2)
 * @returns {Boolean}
 */
function fb_line(
  resource = null,
  x1,
  y1,
  x2,
  y2,
  r = 255,
  g = 255,
  b = 255,
  p = 1
) {
  if (!fb_valid(resource))
    return false

  p = clamp(p, 0.1, 2)
  let x = x2 - x1
  let y = y2 - y1
  let l = Math.sqrt(x * x + y * y) * p

  let ax = x / l
  let ay = y / l

  x = x1
  y = y1

  for (let i = 0; i < l; i += 0.5) {
    if (resource.width > x && resource.height > y)
      fb_set_pixel(resource, x, y, r, g, b)

    x += ax / 2
    y += ay / 2
  }

  fb_defer(resource)

  return true
}

/**
 * Clear the canvas (default color Black)
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} r Red channel
 * @param {Number} g Green channel
 * @param {Number} b Blue channel
 * @returns {Boolean}
 */
function fb_clear(resource = null, r = 255, g = 255, b = 255) {
  if (!fb_valid(resource))
    return false

  for (let i = 0; i < resource.image.data.length; i += 4) {
    resource.image.data[i + FB_CHANNEL_R] = r
    resource.image.data[i + FB_CHANNEL_G] = g
    resource.image.data[i + FB_CHANNEL_B] = b
  }

  fb_defer(resource)

  return true
}

/**
 * Verify that the Framebuffer Resource is valid
 * @param {FBResource} resource Framebuffer Resource
 * @returns {Boolean}
 */
function fb_valid(resource = null) {
  if (resource === null)
    return false

  if (resource instanceof FBResource === false)
    return false

  let fields = [
    'canvas',
    'context',
    'created',
    'defer',
    'dirty',
    'error',
    'height',
    'image',
    'loaded',
    'locked',
    'updated',
    'width',
  ]

  for (let field of fields)
    if (field in resource === false)
      return false

  return true
}

/**
 * Clone the resource
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} cri Red channel index (default 0)
 * @param {Number} cgi Green channel index (default 1)
 * @param {Number} cbi Blue channel index (default 2)
 * @returns {(Boolean|Object)} Framebuffer Resource
 */
function fb_copy(resource = null, cri = 0, cgi = 1, cbi = 2) {
  if (!fb_valid(resource))
    return false

  let copy = fb_create(resource.width, resource.height)

  for (let i = 0, j = resource.image.data.length; i < j;) {
    copy.image.data[i + FB_CHANNEL_R] = resource.image.data[i + cri]
    copy.image.data[i + FB_CHANNEL_G] = resource.image.data[i + cgi]
    copy.image.data[i + FB_CHANNEL_B] = resource.image.data[i + cbi]
    i += 4
  }

  // Synchronize
  copy.context.putImageData(copy.image, 0, 0)

  fb_defer(copy) // FIXME: Do we need to defer?

  return copy
}

/**
 * Create a resource from an asynchronously loaded image
 * <NoDirtyBit>
 * @param {String} url URL to the image
 * @param {Number} width Resource width (-1 for auto)
 * @param {Number} height Resource height (-1 for auto)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_load(
  url = null,  // URL of the image
  width = -1,  // Resource width (-1 for auto)
  height = -1, // Resource height (-1 for auto)
) {
  if (url === null)
    return null

  // Dummy resource
  let resource = fb_create(1, 1)
  resource.loaded = false

  let img = new Image()

  // Event handler
  img.onload = function() {
    if (width == -1)
      width = img.width

    if (height == -1)
      height = img.height

    // Boundary checks
    if (0 >= width) {
      resource.error = fb_error(FB_ERR_BAD_WIDTH)
      return
    }

    if (0 >= height) {
      resource.error = fb_error(FB_ERR_BAD_HEIGHT)
      return
    }

    if (width > FB_MAX_WIDTH) {
      resource.error = fb_error(FB_ERR_LARGE_WIDTH)
      return
    }

    if (height > FB_MAX_HEIGHT) {
      resource.error = fb_error(FB_ERR_LARGE_HEIGHT)
      return
    }

    resource.canvas.width = width
    resource.canvas.height = height
    resource.width = width
    resource.height = height

    fb_draw_source(resource, img, width, height)

    resource.loaded = true
  }

  // Event handler
  img.onerror = function() {
    resource.error = fb_error('Cannot load: ' + url, FB_ERR_CANT_LOAD)
  }

  img.src = url

  return resource
}

/**
 * Draw the contents from a resource child to the resource parent
 * @todo FIXME: Replace fb_set_pixel with Canvas' built-in 'drawImage' equivalent
 * @param {(Object|String)} resource_p Framebuffer Resource we're drawing to (parent)
 * @param {(Object|String)} resource_c Framebuffer Resource being drawn (child)
 * @param {Number} x X axis
 * @param {Number} y Y axis
 * @param {Number} w Width (-1 is child's width)
 * @param {Number} h Height (-1 is child's height)
 * @param {Number} ox X axis offset
 * @param {Number} oy Y axis offset
 * @param {Boolean} transparent Treat tX colors as transparency
 * @param {Number} tr Red channel as transparency (-1 is none)
 * @param {Number} tg Green channel as transparency (-1 is none)
 * @param {Number} tb Blue channel as transparency (-1 is none)
 * @returns {Boolean}
 */
function fb_draw(
  resource_p,
  resource_c,
  x = 0,
  y = 0,
  w = -1,
  h = -1,
  ox = 0,
  oy = 0,
  transparent = false,
  tr = -1,
  tg = -1,
  tb = -1
) {
  if (!fb_valid(resource_p))
    return false

  if (!fb_valid(resource_c))
    return false

  w = clamp(w, -1, resource_c.width) | 0
  h = clamp(h, -1, resource_c.height) | 0

  // Don't draw
  if (w == 0 && h == 0)
    return false

  // If width or height are less than or equal to
  // zero we assign each the child's dimensions
  if (w == -1)
    w = resource_c.width

  if (h == -1)
    h = resource_c.height

  for (let x1 = 0; x1 < w; x1++) {
    for (let y1 = 0; y1 < h; y1++) {
      if (resource_p.width > x1 + x && resource_p.height > y1 + y) {
        let c = fb_get_pixel(resource_c, x1 + ox, y1 + oy)

        if (transparent && c[0] == tr && c[1] == tg && c[2] == tb)
          continue

        fb_set_pixel(resource_p, x1 + x, y1 + y, c[0], c[1], c[2])
      }
    }
  }

  fb_defer(resource_p)

  return true
}

/**
 * Fill the area with the given color starting from x,y until all
 * occurences of the background color have been replaced in that area.
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} x X axis
 * @param {Number} y Y axis
 * @param {Number} r Red channel
 * @param {Number} g Green channel
 * @param {Number} b Blue channel
 * @param {(null|Function)} callback Callback function (default fb_set_pixel)
 * @returns {Boolean}
 */
function fb_fill(
  resource = null,
  x,
  y,
  r,
  g,
  b,
  callback = fb_set_pixel
) {
  if (!fb_valid(resource))
    return false

  let fill_stack = []
  fill_stack.push([x, y])

  let bg_color = fb_get_pixel(resource, x, y)

  if (callback === null)
    callback = fb_set_pixel

  // Let's not shoot ourselves in the foot
  if (bg_color[0] == r && bg_color[1] == g && bg_color[2] == b)
    return false

  while (fill_stack.length > 0) {
    let [x, y] = fill_stack.pop()
    let color = fb_get_pixel(resource, x, y)

    if (0 > x || x > resource.width ||
        0 > y || y > resource.height)
      continue

    if (color[0] != bg_color[0] ||
        color[1] != bg_color[1] ||
        color[2] != bg_color[2])
      continue

    callback(resource, x, y, r, g, b)

    fill_stack.push([x + 1, y])
    fill_stack.push([x - 1, y])
    fill_stack.push([x, y + 1])
    fill_stack.push([x, y - 1])
  }

  fb_defer(resource)

  return true
}

/**
 * Retrieve a specific color channel from a resource
 * // FIXME: test loaded images with alpha
 * Disclaimer: Alpha channel is white if a resource was created.
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} channel Channel index (0=Red, 1=Green, 2=Blue, 3=Alpha) (default 0)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_get_channel(resource = null, channel = 0) {
  if (!fb_valid(resource))
    return null

  channel = clamp(channel, 0, 3)
  return fb_copy(resource, channel, channel, channel)
}

/**
 * Flip image horizontally (X axis)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_flip_x(resource = null) {
  if (!fb_valid(resource))
    return null

  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)

      // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
      let x2 = Math.abs(width - x) - 1
      fb_set_pixel(resource_new, x2, y, c[0], c[1], c[2])
    }
  }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Flip image vertically (Y axis)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_flip_y(resource = null) {
  if (!fb_valid(resource))
    return null

  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)

      // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
      let y2 = Math.abs(height - y) - 1
      fb_set_pixel(resource_new, x, y2, c[0], c[1], c[2])
    }
  }

  fb_defer(resource) // FIXME: need test

  return resource_new
}

/**
 * Rotate image right (90 degrees clockwise)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_rotate_right(resource = null) {
  if (!fb_valid(resource))
    return null

  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(height, width)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)

      // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
      let y2 = Math.abs(height - y) - 1
      fb_set_pixel(resource_new, y2, x, c[0], c[1], c[2])
    }
  }

  fb_defer(resource) // FIXME: need test

  return resource_new
}

/**
 * Rotate image left (90 degrees counterclockwise)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_rotate_left(resource = null) {
  if (!fb_valid(resource))
    return null

  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(height, width)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)

      // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
      let x2 = Math.abs(width - x) - 1
      fb_set_pixel(resource_new, y, x2, c[0], c[1], c[2])
    }
  }

  fb_defer(resource) // FIXME: need test

  return resource_new
}

/**
 * Replace a specific color in the image
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} pr Red channel (parent)
 * @param {Number} pg Green channel (parent)
 * @param {Number} pb Blue channel (parent)
 * @param {Number} cr Red channel (child)
 * @param {Number} cg Green channel (child)
 * @param {Number} cb Blue channel (child)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_color_replace(resource = null, pr, pg, pb, cr, cg, cb) {
  if (!fb_valid(resource))
    return null

  let width = resource.width
  let height = resource.height
  let resource_new = fb_copy(resource)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = fb_get_pixel(resource, x, y)

      if (color[0] == pr && color[1] == pg && color[2] == pb)
        fb_set_pixel(resource_new, x, y, cr, cg, cb)
    }
  }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Invert colors of an image
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_color_invert(resource = null) {
  if (!fb_valid(resource))
    return null

  let resource_new = fb_copy(resource)

  for (let i = 0; i < resource.image.data.length; i += 4) {
    resource_new.image.data[i + FB_CHANNEL_R] ^= 255
    resource_new.image.data[i + FB_CHANNEL_G] ^= 255
    resource_new.image.data[i + FB_CHANNEL_B] ^= 255
  }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Convert image to grayscale
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_color_grayscale(resource = null) {
  if (!fb_valid(resource))
    return null

  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)

      // https://en.wikipedia.org/wiki/Luma_(video)#Use_of_relative_luminance
      c = (c[0] * 0.21) + (c[1] * 0.72) + (c[2] * 0.07)

      fb_set_pixel(resource_new, x, y, c, c, c)
    }
  }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Convert image to 1-bit
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_color_1bit(resource = null) {
  if (!fb_valid(resource))
    return null

  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)

      c = (((c[0] + c[1] + c[2]) / 3) | 0) & 0xFF
      c = c > 127 ? 255 : 0

      fb_set_pixel(resource_new, x, y, c, c, c)
    }
  }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Add grayscale noise to an image
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} scale Amount of noise to add ranging from 0.0 to 10.0 (default 0.1)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_noise_grayscale(resource = null, scale = 0.1) {
  if (!fb_valid(resource))
    return null

  scale = clamp(scale, 0, 10)

  if (scale == 0)
    return resource

  let width = resource.width
  let height = resource.height
  let resource_new = fb_copy(resource)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)
      let noise = Math.floor(Math.random(0) * (255 * scale))

      c[0] = clamp(c[0] + noise, 0, 255)
      c[1] = clamp(c[1] + noise, 0, 255)
      c[2] = clamp(c[2] + noise, 0, 255)

      fb_set_pixel(resource_new, x, y, c[0], c[1], c[2])
    }
  }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Add RGB noise to an image
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} scale Amount of noise to add ranging from 0.0 to 10.0 (default 0.1)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_noise_rgb(resource = null, scale = 0.1) {
  if (!fb_valid(resource))
    return null

  scale = clamp(scale, 0, 10)

  if (scale == 0)
    return resource

  let width = resource.width
  let height = resource.height
  let resource_new = fb_copy(resource)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)

      let noise1 = Math.floor(Math.random(0) * (255 * scale))
      let noise2 = Math.floor(Math.random(0) * (255 * scale))
      let noise3 = Math.floor(Math.random(0) * (255 * scale))

      c[0] = clamp(c[0] + noise1, 0, 255)
      c[1] = clamp(c[1] + noise2, 0, 255)
      c[2] = clamp(c[2] + noise3, 0, 255)

      fb_set_pixel(resource_new, x, y, c[0], c[1], c[2])
    }
  }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Apply a convolution matrix to an image
 * More information:
 *  - https://en.wikipedia.org/wiki/Kernel_(image_processing)
 *  - https://en.wikipedia.org/wiki/Convolution
 *  - https://docs.gimp.org/2.8/en/plug-in-convmatrix.html
 * @todo: FIXME: See if 'Row- and column-major order' matters here.
 *               Ideally we'd want to loop over in row-major order
 *               i.e. (X loop inside Y)
 * @param {FBResource} resource Framebuffer Resource
 * @param {Array} matrix Convolution matrix (3x3 or 5x5)
 * @param {Number} divisor How much to divide the average result
 * @param {Number} offset Value to add to the quotient (division result)
 * @returns {(null|FBResource|FBError)} Framebuffer Resource
 */
function fb_convolution_matrix(
  resource = null,
  matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0],
  divisor = 1,
  offset = 0
) {
  if (!fb_valid(resource))
    return null

  if (matrix.length != 9 && matrix.length != 25)
    return fb_error(FB_ERR_CONVOLUTION_MATRIX_SIZE)

  let resource_new = fb_copy(resource)
  let w = resource.width
  let h = resource.height
  let cm = matrix

  // Convolution matrix (3 x 3)
  //
  // [
  //    A0  A1  A2
  //
  //    B0  B1  B2
  //
  //    C0  C1  C2
  // ]
  if (matrix.length == 9) {
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        // 3 x 3 grid
        let a0 = fb_get_pixel(resource, x - 1, y - 1)
        let a1 = fb_get_pixel(resource, x    , y - 1)
        let a2 = fb_get_pixel(resource, x + 1, y - 1)

        let b0 = fb_get_pixel(resource, x - 1, y    )
        let b1 = fb_get_pixel(resource, x    , y    )
        let b2 = fb_get_pixel(resource, x + 1, y    )

        let c0 = fb_get_pixel(resource, x - 1, y + 1)
        let c1 = fb_get_pixel(resource, x    , y + 1)
        let c2 = fb_get_pixel(resource, x + 1, y + 1)

        // Apply convolution matrix
        a0[0] *= cm[0]
        a0[1] *= cm[0]
        a0[2] *= cm[0]

        a1[0] *= cm[1]
        a1[1] *= cm[1]
        a1[2] *= cm[1]

        a2[0] *= cm[2]
        a2[1] *= cm[2]
        a2[2] *= cm[2]

        b0[0] *= cm[3]
        b0[1] *= cm[3]
        b0[2] *= cm[3]

        b1[0] *= cm[4]
        b1[1] *= cm[4]
        b1[2] *= cm[4]

        b2[0] *= cm[5]
        b2[1] *= cm[5]
        b2[2] *= cm[5]

        c0[0] *= cm[6]
        c0[1] *= cm[6]
        c0[2] *= cm[6]

        c1[0] *= cm[7]
        c1[1] *= cm[7]
        c1[2] *= cm[7]

        c2[0] *= cm[8]
        c2[1] *= cm[8]
        c2[2] *= cm[8]

        let avg = [
          (a0[0] + a1[0] + a2[0] +
           b0[0] + b1[0] + b2[0] +
           c0[0] + c1[0] + c2[0]) / divisor,

          (a0[1] + a1[1] + a2[1] +
           b0[1] + b1[1] + b2[1] +
           c0[1] + c1[1] + c2[1]) / divisor,

          (a0[2] + a1[2] + a2[2] +
           b0[2] + b1[2] + b2[2] +
           c0[2] + c1[2] + c2[2]) / divisor
        ]

        let pos = w * y * 4 + x * 4

        resource_new.image.data[pos + FB_CHANNEL_R] = avg[0] + offset
        resource_new.image.data[pos + FB_CHANNEL_G] = avg[1] + offset
        resource_new.image.data[pos + FB_CHANNEL_B] = avg[2] + offset
      }
    }
  }

  // Convolution matrix (5 x 5)
  //
  // [
  //    A0  A1  A2  A3  A4
  //
  //    B0  B1  B2  B3  B4
  //
  //    C0  C1  C2  C3  C4
  //
  //    D0  D1  D2  D3  D4
  //
  //    E0  E1  E2  E3  E4
  // ]
  if (matrix.length == 25) {
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        // 5 x 5 grid
        let a0 = fb_get_pixel(resource, x - 2, y - 2)
        let a1 = fb_get_pixel(resource, x - 1, y - 2)
        let a2 = fb_get_pixel(resource, x    , y - 2)
        let a3 = fb_get_pixel(resource, x + 1, y - 2)
        let a4 = fb_get_pixel(resource, x + 2, y - 2)

        let b0 = fb_get_pixel(resource, x - 2, y - 1)
        let b1 = fb_get_pixel(resource, x - 1, y - 1)
        let b2 = fb_get_pixel(resource, x    , y - 1)
        let b3 = fb_get_pixel(resource, x + 1, y - 1)
        let b4 = fb_get_pixel(resource, x + 2, y - 1)

        let c0 = fb_get_pixel(resource, x - 2, y    )
        let c1 = fb_get_pixel(resource, x - 1, y    )
        let c2 = fb_get_pixel(resource, x    , y    )
        let c3 = fb_get_pixel(resource, x + 1, y    )
        let c4 = fb_get_pixel(resource, x + 2, y    )

        let d0 = fb_get_pixel(resource, x - 2, y + 1)
        let d1 = fb_get_pixel(resource, x - 1, y + 1)
        let d2 = fb_get_pixel(resource, x    , y + 1)
        let d3 = fb_get_pixel(resource, x + 1, y + 1)
        let d4 = fb_get_pixel(resource, x + 2, y + 1)

        let e0 = fb_get_pixel(resource, x - 2, y + 2)
        let e1 = fb_get_pixel(resource, x - 1, y + 2)
        let e2 = fb_get_pixel(resource, x    , y + 2)
        let e3 = fb_get_pixel(resource, x + 1, y + 2)
        let e4 = fb_get_pixel(resource, x + 2, y + 2)

        // Apply convolution matrix
        a0[0] *= cm[0]
        a0[1] *= cm[0]
        a0[2] *= cm[0]

        a1[0] *= cm[1]
        a1[1] *= cm[1]
        a1[2] *= cm[1]

        a2[0] *= cm[2]
        a2[1] *= cm[2]
        a2[2] *= cm[2]

        a3[0] *= cm[3]
        a3[1] *= cm[3]
        a3[2] *= cm[3]

        a4[0] *= cm[4]
        a4[1] *= cm[4]
        a4[2] *= cm[4]

        b0[0] *= cm[5]
        b0[1] *= cm[5]
        b0[2] *= cm[5]

        b1[0] *= cm[6]
        b1[1] *= cm[6]
        b1[2] *= cm[6]

        b2[0] *= cm[7]
        b2[1] *= cm[7]
        b2[2] *= cm[7]

        b3[0] *= cm[8]
        b3[1] *= cm[8]
        b3[2] *= cm[8]

        b4[0] *= cm[9]
        b4[1] *= cm[9]
        b4[2] *= cm[9]

        c0[0] *= cm[10]
        c0[1] *= cm[10]
        c0[2] *= cm[10]

        c1[0] *= cm[11]
        c1[1] *= cm[11]
        c1[2] *= cm[11]

        c2[0] *= cm[12]
        c2[1] *= cm[12]
        c2[2] *= cm[12]

        c3[0] *= cm[13]
        c3[1] *= cm[13]
        c3[2] *= cm[13]

        c4[0] *= cm[14]
        c4[1] *= cm[14]
        c4[2] *= cm[14]

        d0[0] *= cm[15]
        d0[1] *= cm[15]
        d0[2] *= cm[15]

        d1[0] *= cm[16]
        d1[1] *= cm[16]
        d1[2] *= cm[16]

        d2[0] *= cm[17]
        d2[1] *= cm[17]
        d2[2] *= cm[17]

        d3[0] *= cm[18]
        d3[1] *= cm[18]
        d3[2] *= cm[18]

        d4[0] *= cm[19]
        d4[1] *= cm[19]
        d4[2] *= cm[19]

        e0[0] *= cm[20]
        e0[1] *= cm[20]
        e0[2] *= cm[20]

        e1[0] *= cm[21]
        e1[1] *= cm[21]
        e1[2] *= cm[21]

        e2[0] *= cm[22]
        e2[1] *= cm[22]
        e2[2] *= cm[22]

        e3[0] *= cm[23]
        e3[1] *= cm[23]
        e3[2] *= cm[23]

        e4[0] *= cm[24]
        e4[1] *= cm[24]
        e4[2] *= cm[24]

        let avg = [
          (a0[0] + a1[0] + a2[0] + a3[0] + a4[0] +
           b0[0] + b1[0] + b2[0] + b3[0] + b4[0] +
           c0[0] + c1[0] + c2[0] + c3[0] + c4[0] +
           d0[0] + d1[0] + d2[0] + d3[0] + d4[0] +
           e0[0] + e1[0] + e2[0] + e3[0] + e4[0]) / divisor,

          (a0[1] + a1[1] + a2[1] + a3[1] + a4[1] +
           b0[1] + b1[1] + b2[1] + b3[1] + b4[1] +
           c0[1] + c1[1] + c2[1] + c3[1] + c4[1] +
           d0[1] + d1[1] + d2[1] + d3[1] + d4[1] +
           e0[1] + e1[1] + e2[1] + e3[1] + e4[1]) / divisor,

          (a0[2] + a1[2] + a2[2] + a3[2] + a4[2] +
           b0[2] + b1[2] + b2[2] + b3[2] + b4[2] +
           c0[2] + c1[2] + c2[2] + c3[2] + c4[2] +
           d0[2] + d1[2] + d2[2] + d3[2] + d4[2] +
           e0[2] + e1[2] + e2[2] + e3[2] + e4[2]) / divisor,
        ]

        let pos = w * y * 4 + x * 4

        resource_new.image.data[pos + FB_CHANNEL_R] = avg[0] + offset
        resource_new.image.data[pos + FB_CHANNEL_G] = avg[1] + offset
        resource_new.image.data[pos + FB_CHANNEL_B] = avg[2] + offset
      }
    }
  }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Sharpen the image
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_sharpen(resource = null) {
  if (!fb_valid(resource))
    return null

  let resource_new = fb_copy(resource)

  resource_new = fb_convolution_matrix(
    resource_new,
    [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ]
  )

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Resize the image (using nearest neighbor)
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} w Width (rounded to nearest place)
 * @param {Number} h Height (rounded to nearest place)
 * @param {Boolean} restore Return resized resource in its original dimension
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_resize(resource = null, w = 0, h = 0, restore = false) {
  if (!fb_valid(resource))
    return null

  w |= 0
  h |= 0

  // If the dimensions have not changed,
  // return the affectee resource
  if (w == 0 || w == resource.width && h == 0 || h == resource.height)
    return resource

  // Keep original dimensions
  let w_copy = resource.width
  let h_copy = resource.height

  let resource_new = fb_create(w, h)

  // Difference values between resource
  // and resource_new dimensions
  xd = resource.width  / w
  yd = resource.height / h

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let c = fb_get_pixel(resource, xd * x, yd * y)

      for (let i = 0; i < xd; i += xd) {
        for (let j = 0; j < yd; j += yd) {
          fb_set_pixel(resource_new, x + i, y + j, c[0], c[1], c[2])
        }
      }
    }
  }

  fb_sync(resource_new)

  if (restore)
    return fb_resize(resource_new, w_copy, h_copy)

  return resource_new
}

/**
 * Pixelate an image
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} factor How much to divide image dimensions before upsampling (default 2, min 1)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_pixelate(resource = null, factor = 2) {
  if (!fb_valid(resource))
    return null

  // Factor min can be 1
  factor = clamp(factor, 1) | 0 // FIXME: Is this correct?

  // If factor is 1 return the affectee resource
  if (factor == 1)
    return resource

  let resource_new = fb_copy(resource)

  // Original dimensions
  let ow = resource.width
  let oh = resource.height

  // Sampled dimensions
  let sw = clamp((ow / factor) | 0, 1)
  let sh = clamp((oh / factor) | 0, 1)

  // Downsample and upsample using nearest neighbor
  resource_new = fb_resize(resource_new, sw, sh)
  resource_new = fb_resize(resource_new, ow, oh)

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Crop an image.
 *
 * In Mode 1, X1 and Y1 cannot be bigger than X2 and Y2 respectively.
 * X1 and Y1 define Point #1 on the image which is the starting point
 * and X2 and Y2 define Point #2 which is the ending point.
 * All values between those 2 points will be the returned resource
 * that contains the pixel data cropped within that area.
 *
 * If X1 or Y1 are equal to their neighboring counterparts, then the
 * values of X2 or Y2 are increment by 1.
 * If X1 is 42 and X2 is 42 then X2 will be 43 as we cannot return
 * a cropped image if the 2 points fall on the same exact coordinate i.e.
 * we cannot have an image whose sides are 0.
 *
 * Mode 2 overrides the resource_new width and height by treating
 * X2 and Y2 as the dimensions and not the 2nd point on the image.
 *
 * If the width or height exceed the boundary of the affectee resource
 * then the value that fb_get_pixel() returns by default when out of
 * bounds will be written to the copy resource.
 *
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} x1 X axis (Point 1)
 * @param {Number} y1 Y axis (Point 1)
 * @param {Number} x2 X axis (Point 2)
 * @param {Number} y2 Y axis (Point 2)
 * @param {Number} mode If 1, values [x2, y2] are used as width and height
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_crop(resource = null, x1 = 0, y1 = 0, x2 = 1, y2 = 1, mode = 0) {
  if (!fb_valid(resource))
    return null

  // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
  x1 = Math.abs(x1) | 0
  y1 = Math.abs(y1) | 0
  x2 = Math.abs(x2) | 0
  y2 = Math.abs(y2) | 0

  mode = clamp(mode, 0, 1)

  if (mode == 0) {
    // Here we try to save people from making pesky mistakes
    if (x1 == x2)
      ++x2

    if (y1 == y2)
      ++y2

    // If Point #1 is bigger than Point #2 then flip their values
    if (x1 > x2)
      [x1, x2] = [x2, x1]

    if (y1 > y2)
      [y1, y2] = [y2, y1]
  }

  // Mode 1: Point #2 must be within the dimension boundaries of the resource
  if (mode == 0) {
    x2 = clamp(x2, 0, resource.width)
    y2 = clamp(y2, 0, resource.height)
  }

  let w, h

  if (mode == 1) {
    w = x2
    h = y2
  } else {
    w = (x2 - x1) | 0
    h = (y2 - y1) | 0
  }

  let resource_new = fb_create(w, h)
  let mx = w + x1
  let my = h + y1

  for (let x = x1; x < mx; x++)
    for (let y = y1; y < my; y++) {
      let c = fb_get_pixel(resource, x, y)

      fb_set_pixel(
        resource_new,
        x - x1,
        y - y1,
        c[0],
        c[1],
        c[2]
      )
    }

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Detect edges in an image
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} mode Available modes [0..2]
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_detect_edge(resource = null, mode = 0) {
  if (!fb_valid(resource))
    return null

  mode = clamp(mode, 0, 2)

  let resource_new = fb_copy(resource)

  if (mode == 0)
    resource_new = fb_convolution_matrix(
      resource_new,
      [
        1,  0, -1,
        0,  0,  0,
       -1,  0,  1
      ]
    )

  if (mode == 1)
    resource_new = fb_convolution_matrix(
      resource_new,
      [
        0,  1,  0,
        1, -4,  1,
        0,  1,  0
      ]
    )

  if (mode == 2)
    resource_new = fb_convolution_matrix(
      resource_new,
      [
       -1, -1, -1,
       -1,  8, -1,
       -1, -1, -1
      ]
    )

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Box blur
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} max How many times to call the convolution matrix function (min 1)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_blur_box(resource = null, max = 1) {
  if (!fb_valid(resource))
    return null

  let resource_new = fb_copy(resource)
  max = clamp(max, 1)

  for (let i = 0; i < max; i++)
    resource_new = fb_convolution_matrix(
      resource_new,
      [
        1,  1,  1,
        1,  1,  1,
        1,  1,  1
      ],
      9
    )

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Gaussian blur
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} max How many times to call the convolution matrix function (min 1)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_blur_gaussian(resource = null, max = 1) {
  if (!fb_valid(resource))
    return null

  let resource_new = fb_copy(resource)
  max = clamp(max, 1)

  for (let i = 0; i < max; i++)
    resource_new = fb_convolution_matrix(
      resource_new,
      [
        1,  2,  1,
        2,  4,  2,
        1,  2,  1
      ],
      16
    )

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Emboss
 * @param {FBResource} resource Framebuffer Resource
 * @param {Number} power How many times to apply the convolution matrix (min 0.01)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_emboss(resource = null, power = 1) {
  if (!fb_valid(resource))
    return null

  let resource_new = fb_copy(resource)
  power = clamp(power, 0.01)

  resource_new = fb_convolution_matrix(
    resource_new,
    [
     -2 * power, -1 * power,  0 * power,
     -1 * power,  1 * power,  1 * power,
      0 * power,  1 * power,  2 * power
    ],
    9
  )

  fb_defer(resource_new) // FIXME: need test

  return resource_new
}

/**
 * Block modifications to the Framebuffer Resource (lock)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {Boolean}
 */
function fb_lock(resource = null) {
  if (!fb_valid(resource))
    return false

  resource.locked = true
  return true
}

/**
 * Allow modifications to the Framebuffer Resource (unlock)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {Boolean}
 */
function fb_unlock(resource = null) {
  if (!fb_valid(resource))
    return false

  resource.locked = false
  return true
}

/**
 * Replace a Framebuffer Resource with a different one
 * This function synchronizes automatically
 * <NoDefer>
 * @param {(Object|String)} resource_p Framebuffer Resource (parent)
 * @param {(Object|String)} resource_c Framebuffer Resource (child)
 * @return {Boolean}
 */
function fb_replace(resource_p = null, resource_c = null) {
  if (!fb_valid(resource_p))
    return false

  if (!fb_valid(resource_c))
    return false

  let cw = resource_c.width
  let ch = resource_c.height

  resource_p.canvas.width = cw
  resource_p.canvas.height = ch
  resource_p.width = cw
  resource_p.height = ch

  // Synchronize
  resource_p.context.putImageData(resource_c.image, 0, 0)
  resource_p.image = resource_p.context.getImageData(0, 0, cw, ch)

  return true
}

/**
 * Alias for 'drawImage' and 'getImageData'.
 * Internal function.
 * <NoDefer>
 * @param {FBResource} resource Framebuffer Resource (parent)
 * @param {(Element|Object)} source Source Element (see drawImage MDN)
 * @param {Number} source_width
 * @param {Number} source_height
 * @return {Boolean}
 */
function fb_draw_source(resource = null, source = null, source_width = null, source_height = null) {
  if (!fb_valid(resource))
    return false

  if (source === null)
    return false

  if (source_width === null)
    return false

  if (source_height === null)
    return false

  resource.context.drawImage(source, 0, 0, source_width, source_height)
  resource.image = resource.context.getImageData(0, 0, source_width, source_height)

  return true
}

/**
 * Defer-bit handler.
 * Internal function.
 * @param {FBResource} resource Framebuffer Resource
 * @returns {undefined}
 */
function fb_defer(resource = null) {
  if (!fb_valid(resource))
    return

  // Defer disabled - synchronize
  if (resource.defer == FB_DEFER_WRITE_THROUGH)
    fb_sync(resource)
}

/**
 * Configuration getter/setter.
 * Disclaimer: Always check against FB_ERR_BAD_CFG_* constants (user-code)
 * @param {String} key Configuration key
 * @param {mixed} value Value key (use '<default>' to assign default value)
 * @returns {mixed} True when value set (undefined on invalid key)
 */
function fb_config(key = null, value = undefined) {
  if (key === null)
    return

  // Invalid key
  if (!fb_config_map_keys.includes(key))
    return fb_error(FB_ERR_BAD_CFG_KEY)

  // Get current key value
  if (value === undefined)
    return fb_config_map[key].value

  // Set default value
  if (value === '<default>') {
    if ('_set' in fb_config_map[key])
      fb_config_map[key]._set(fb_config_map[key].default, fb_config_map[key])
    else
      fb_config_map[key].value = fb_config_map[key].default

    return true
  }

  // Check if value is allowed
  if (!fb_config_map[key].allowed.includes(value))
    return fb_error(FB_ERR_BAD_CFG_VALUE)

  // Set key value
  if ('_set' in fb_config_map[key])
    fb_config_map[key]._set(value, fb_config_map[key])
  else
    fb_config_map[key].value = value

  return true
}

/**
 * Get default value for a configuration key
 * Disclaimer: Always check against FB_ERR_BAD_CFG_* constants (user-code)
 * @param {String} key Configuration key
 * @returns {mixed} Default value (undefined on invalid key)
 */
function fb_config_default(key = null) {
  if (key === null)
    return

  key = key.toLowerCase()

  if (fb_config_map_keys.includes(key))
    return fb_config_map[key].default

  return fb_error(FB_ERR_BAD_CFG_KEY)
}

/**
 * Synchronize resource configurations with
 * the global values in 'fb_config_map'.
 * Stub function.
 * @returns {FBError}
 */
function fb_sync_config() {
  return fb_error(FB_ERR_STUB_FUNCTION)
}

/**
 * Get framebuffer.js version
 * Returns ISO 8601 (YYYY-MM-DD) on empty format
 * @param {(null|String)} format Format to use (Y, M, and D letters are replaced with YEAR, MONTH, and DAY)
 * @returns {String}
 */
function fb_version(format = null) {
  let y = FB_VERSION_YEAR
  let m = String(FB_VERSION_MONTH).padStart(2, '0')
  let d = String(FB_VERSION_DAY).padStart(2, '0')

  if (format === null)
    return y + '-' + m + '-' + d

  format = format.replace(/Y/g, y)
                 .replace(/M/g, m)
                 .replace(/D/g, d)

  return format
}

/**
 * Hook a function
 * @param {String} func Function name
 * @param {Number} hook_func Hooked function
 * @param {Boolean} active Activate hook on creation
 * @returns {(String|Boolean|FBError)}
 */
function fb_hook(func = null, hook_func = null, active = true) {
  if (func === null)
    return false

  // Not a string
  if (typeof func !== 'string')
    return false

  // Function is blacklisted from being hooked via library methods
  if (fb_hook_blacklist.includes(func))
    return fb_error(FB_ERR_FUNC_BLACKLISTED)

  // Function already hooked
  //
  // 'true' because it's already hooked
  // no error checks need to be done
  if (fb_hooked(func))
    return true

  // Initialize hook store
  fb_hooked_functions[func] = {
    active: false,
    original: window[func],
    hooked: hook_func,
  }

  fb_hooked_functions[func].hooked.name = func

  // Reference to the hook
  window[func] = fb_hooked_functions[func].original

  // Activate hook on creation
  if (active)
    fb_hook_enable(func)

  return true
}

/**
 * Is the function hook enabled?
 * @param {String} func Function name
 * @returns {Boolean}
 */
function fb_hook_active(func = null) {
  return fb_hooked(func) && fb_hooked_functions[func].active
}

/**
 * Call original function from a hook.
 * Used inside fb_hook()'s callback function.
 * @param {String} func Function name
 * @param {Array} args Array of arguments
 * @returns {Boolean}
 */
function fb_hook_call(func = null, args = []) {
  if (func === null)
    return false

  // Not a string
  if (typeof func !== 'string')
    return false

  // Not hooked
  if (!fb_hooked(func))
    return false

  // Call function
  return fb_hooked_functions[func].original(...args)
}

/**
 * Disable function hook
 * @param {String} func Function name
 * @returns {Boolean}
 */
function fb_hook_disable(func = null) {
  // Not hooked
  if (!fb_hooked(func))
    return false

  // Disable hook
  fb_hooked_functions[func].active = false
  window[func] = fb_hooked_functions[func].original

  return true
}

/**
 * Enable function hook
 * @param {String} func Function name
 * @returns {Boolean}
 */
function fb_hook_enable(func = null) {
  // Not hooked
  if (!fb_hooked(func))
    return false

  // Enable hook
  fb_hooked_functions[func].active = true
  window[func] = fb_hooked_functions[func].hooked

  return true
}

/**
 * Check to see that a function is hooked
 * @param {String} func Function name
 * @returns {Boolean}
 */
function fb_hooked(func = null) {
  if (func === null)
    return false

  // Not a string
  if (typeof func !== 'string')
    return false

  return func in fb_hooked_functions
}

/**
 * Unhook a function
 * @param {String} func Function name
 * @returns {Boolean}
 */
function fb_unhook(func = null) {
  // Not hooked
  if (!fb_hooked(func))
    return false

  // Restore original function
  window[func] = fb_hooked_functions[func].original

  // Delete hook
  delete fb_hooked_functions[func]

  return true
}

/**
 * Generate Data URL for the Resource image.
 * @param {FBResource} resource
 * @returns {String|null} Data URL
 */
function fb_data_url(resource = null) {
  if (!fb_valid(resource))
    return null

  return resource.canvas.toDataURL()
}

/**
 * Clamp a value between low and high
 * @param {Number} v Value
 * @param {Number} l Lowest possible value
 * @param {Number} h Highest possible value
 * @returns {Number} Clamped value
 */
function clamp(v, l, h) {
  if (l > v) return l
  if (h < v) return h
             return v
}

/**
 * Return a UNIX timestamp
 * @returns {Number}
 */
function time() {
  return (+Date.now() / 1000) | 0
}

/**
 * Return a UNIX timestamp with miliseconds
 * @returns {Number}
 */
function time_precise() {
  return +Date.now()
}

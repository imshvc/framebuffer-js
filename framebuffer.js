// Authors: Nurudin Imsirovic <realnurudinimsirovic@gmail.com>
// Library: Abstraction Layer For 2D Canvas
// License: WTFPL v2 (See license.txt)
// Project: https://github.com/imshvc/framebuffer-js
// Created: 2024-05-01 08:34 PM
// Updated: 2024-09-22 08:23 PM

// Calendar Versioning (CalVer)
//
// See 1: https://calver.org/
// See 2: https://stripe.com/blog/api-versioning
// See 3: https://en.wikipedia.org/wiki/ISO_8601#Calendar_dates
const FB_VERSION_YEAR  = 2024;
const FB_VERSION_MONTH = 9;
const FB_VERSION_DAY   = 22;

// Origin types (useful for logging, errors, etc)
const FB_ORIGIN_SYSTEM = 0; // Result originates from system (library) code.
const FB_ORIGIN_USER   = 1; // Result originates from user code.

/**
 * FBResource prototype
 * @constructor
 * @module FBResource
 * @param {...*} var_args
 * @returns {FBResource}
 */
function FBResource() {
  Object.assign(this, ...arguments);
}

/**
 * FBError prototype
 * @constructor
 * @module FBError
 * @param {null|string} text
 * @param {null|string} id
 * @param {number} origin
 * @param {null|string} func
 * @param {null|array} args
 * @returns {FBError}
 */
function FBError(text = null, id = null, origin = FB_ORIGIN_USER, func = null, args = null) {
  this.text = text;
  this.id = id;
  this.origin = origin;
  this.func = {};
  this.func.name = func;
  this.func.args = args;
  this.created = +Date.now(); // UNIX time on creation
}

/**
 * FBErrorDefinition prototype
 * @constructor
 * @module FBErrorDefinition
 * @param {string} text
 * @param {string} id
 * @returns {FBErrorDefinition}
 */
function FBErrorDefinition(text = null, id = null) {
  this.text = text;
  this.id = id;
}

// Default Canvas Context Attributes
// See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
var fb_canvas_context_attributes = {
  // Canvas contains an alpha channel.
  //
  // On 'false' the browser knows that the backdrop is always opaque,
  // which can speed up drawing of transparent content and images.
  //
  // On 'true' certain hardware or software configurations may
  // yield diminishing results in terms of rendering performance.
  alpha: false,

  // Color space of the rendering context.
  colorSpace: 'srgb',

  // A boolean value that hints the user agent to reduce the latency
  // by desynchronizing the canvas paint cycle from the event loop.
  //
  // Disclaimer: Certain browsers have odd behavior where the canvas
  // is absolutely invisible (due to software bugs, or hardware limits)
  // therefore this option is set to 'false'.
  //
  // Use fb_config() to set the value before any resources have been
  // created.
  desynchronized: false,

  // Whether or not a lot of read-back operations are planned.
  // This will force the use of a software (instead of hardware
  // accelerated) 2D canvas and can save memory when calling
  // 'getImageData()' frequently.
  willReadFrequently: true,
};

// Dimension constraints
//
// Disclaimer: We impose our own, but constraints are often set
// by the browser, or due to hardware limitation. This is a
// known upper limit to "work" but no guarantees it will on
// every device.
const FB_MAX_WIDTH  = 32767;
const FB_MAX_HEIGHT = 32767;

// Color channel offsets
const FB_CHANNEL_R = 0;
const FB_CHANNEL_G = 1;
const FB_CHANNEL_B = 2;
const FB_CHANNEL_A = 3;

// Defer methods
const FB_DEFER_WRITE_THROUGH = 0;
const FB_DEFER_WRITE_BACK    = 1;

// Error definitions - Bi-directional map
var fb_error_defs = {
  FB_ERR_UNSPECIFIED: 'unspecified error',
  FB_ERR_BAD_WIDTH: 'width less than or equal to zero (0 >= width)',
  FB_ERR_BAD_HEIGHT: 'height less than or equal to zero (0 >= height)',
  FB_ERR_LARGE_WIDTH: 'width larger than allowed size (>' + FB_MAX_WIDTH + ')',
  FB_ERR_LARGE_HEIGHT: 'height larger than allowed size (>' + FB_MAX_HEIGHT + ')',
  FB_ERR_STUB_FUNCTION: 'stub function or method',
  FB_ERR_FUNC_BLACKLISTED: 'function is blacklisted from being hooked via library methods',
  FB_ERR_BAD_CFG_KEY: 'bad configuration key',
  FB_ERR_BAD_CFG_VALUE: 'bad configuration value',
  FB_ERR_BAD_HOOK_TYPE: 'bad function hook type',
  FB_ERR_HOOK_CALL_FAILED: 'hook call failed',
  FB_ERR_PATH_NOT_FOUND: 'path not found',
  FB_ERR_FILE_NOT_FOUND: 'file not found',
  FB_ERR_INVALID_FUNCTION: 'invalid function',
  FB_ERR_INVALID_ACCESS: 'invalid access',
  FB_ERR_INVALID_DATA: 'invalid data',
  FB_ERR_USER_GENERATED: 'user generated error',
  FB_ERR_UNHANDLED_CASE: 'unhandled case',
  FB_ERR_RES_LIST_DISABLED: 'resource list disabled by configuration',
  FB_ERR_CONVOLUTION_MATRIX_SIZE: 'convolution matrix must be of size 3x3 (9) or 5x5 (25)',
  FB_ERR_BAD_RESOURCE_STRUCTURE: 'bad resource structure',
  FB_ERR_FROM_SYSTEM: 'system-initiated error',
  FB_ERR_CANVAS_NOT_SUPPORTED: 'canvas not supported',
  FB_ERR_EXPECTS_RESOURCE: 'expects a framebuffer resource',
  FB_ERR_EXPECTS_CONTAINER: 'expects container to be an element',
};

// Expand error definitions to global scope
for (let id in fb_error_defs) {
  let text = fb_error_defs[id];

  // create an error definition to differentiate
  // between built-in and user-provided errors
  fb_error_defs[id] = new FBErrorDefinition(text, id);

  // assign global variable as reference to error text
  window[id] = fb_error_defs[id];
}

// Object containing hooked functions
// See 'fb_hook()' function.
// Wiki: https://en.wikipedia.org/wiki/Hooking
var fb_hooked_functions = {};

// Blacklisted functions from hooks
var fb_hook_blacklist = [
  'fb_hook',
  'fb_hook_active',
  'fb_hook_call',
  'fb_hook_disable',
  'fb_hook_enable',
  'fb_hooked',
  'fb_unhook',
];

// References to created and/or loaded Framebuffer Resources
// Even if a resource is assigned to a variable, it's object
// should realistically be here.
var fb_resource_list = [];

// Errors generated by fb_error()
// Disabled by default. Use fb_config()
// to enable logging.
var fb_errors = [];

// Configuration map keys accessible by 'fb_config()'
var fb_config_map_keys = [
  'alpha',
  'defer',
  'error_log',
  'resource_list',
  'desync',
];

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
      parent.value = value;
      fb_canvas_context_attributes.alpha = value;
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
      parent.value = value;
    },
  },

  // Log errors by fb_error()
  error_log: {
    allowed: [0, 1, false, true],
    default: 0,
    value: 0,

    // Private methods
    _set: function(value, parent) {
      parent.value = value;
    }
  },

  // Use 'fb_resource_list' as an array of
  // resources created throughout the script
  // lifetime
  resource_list: {
    allowed: [0, 1, false, true],
    default: 0,
    value: 0,

    // Private methods
    _set: function(value, parent) {
      parent.value = value;
    }
  },

  // Canvas 2D Context Desynchronization
  // Some browsers require this to be disabled.
  desync: {
    allowed: [0, 1, false, true],
    default: 0,
    value: 0,

    // Private methods
    _set: function(value, parent) {
      parent.value = value;
      fb_canvas_context_attributes.desynchronized = value;
    }
  },
};

/**
 * Create a Framebuffer Resource
 * @param {number} width Width
 * @param {number} height Height
 * @returns {Object} Framebuffer Resource
 */
function fb_create(width = 0, height = 0) {
  let FN_NAME = 'fb_create';
  let FN_ARGS = [...arguments];

  // Convert to decimal
  width |= 0;
  height |= 0;

  let resource = new FBResource({
    canvas: null,
    width: width,
    height: height,
    context: null,
    image: null,

    // UNIX time on creation
    created: +Date.now(),

    // UNIX time on update (fb_sync call)
    //
    // Default to zero to indicate that no
    // updates have occured since creation.
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
  });

  // Boundary checks
  if (0 >= width) {
    resource.error = fb_error(FB_ERR_BAD_WIDTH, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
    return resource;
  }

  if (0 >= height) {
    resource.error = fb_error(FB_ERR_BAD_HEIGHT, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
    return resource;
  }

  if (width > FB_MAX_WIDTH) {
    resource.error = fb_error(FB_ERR_LARGE_WIDTH, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
    return resource;
  }

  if (height > FB_MAX_HEIGHT) {
    resource.error = fb_error(FB_ERR_LARGE_HEIGHT, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
    return resource;
  }

  resource.canvas = document.createElement('canvas');
  resource.canvas.width = width;
  resource.canvas.height = height;

  resource.context = resource.canvas.getContext(
    '2d', fb_canvas_context_attributes
  );

  // Failed to create context
  // Canvas not supported
  if (resource.context === null) {
    resource.error = fb_error(FB_ERR_CANVAS_NOT_SUPPORTED, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
    return resource;
  }

  resource.image = new ImageData(width, height);
  resource.image.data.fill(255);

  // Synchronize
  fb_sync(resource);

  return resource;
}

/**
 * Synchronize ImageData to the Canvas
 * @param {...FBResource} var_args Framebuffer Resource(s)
 * @returns {number} Valid resources synchronized
 */
function fb_sync(var_args) {
  let count = 0;

  for (let resource of arguments) {
    if (!fb_valid(resource)) {
      continue;
    }

    ++count;
    resource.context.putImageData(resource.image, 0, 0);
    fb_update(resource);
  }

  return count;
}

/**
 * Update resource and reset dirty-bit
 * <InternalFunction>
 * @param {FBResource} resource Framebuffer Resource
 * @returns {boolean}
 */
function fb_update(resource = null) {
  if (!fb_valid(resource)) {
    return false;
  }

  resource.dirty = 0;
  resource.updated = +Date.now();

  return true;
}

/**
 * Set RGB pixel color at X and Y coordinates
 * <NoDefer>
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} x X axis
 * @param {number} y Y axis
 * @param {number} r Red channel
 * @param {number} g Green channel
 * @param {number} b Blue channel
 */
function fb_set_pixel(resource = null, x, y, r, g, b) {
  if (!fb_valid(resource)) {
    return;
  }

  if (resource.locked) {
    return;
  }

  x |= 0;
  y |= 0;

  let pos = resource.width * y * 4 + x * 4;

  resource.image.data[pos + FB_CHANNEL_R] = r;
  resource.image.data[pos + FB_CHANNEL_G] = g;
  resource.image.data[pos + FB_CHANNEL_B] = b;

  resource.dirty = 1;
}

/**
 * Get pixel color at the specified X and Y coordinates.
 * <PolymorphicFunction, NoDefer>
 *
 * @description
 * - If both X and Y are provided, the function performs a
 *   lookup using the X and Y coordinates.
 *
 * - If only X is provided (Y is null), the function
 *   performs a linear access using X as an index.
 *
 * - The returned array always contains the Red, Green,
 *   and Blue channel values, in that order.
 *
 * - If X is not divisible by 4, the returned channel
 *   colors may be incorrect. Ensure X is divisible by
 *   4 for accurate results.
 *
 * @param {FBResource} resource Framebuffer Resource
 * @param {null|number} x X axis (linear data access when Y is null)
 * @param {null|number} [y] Y axis (can be null)
 * @returns {number[]} An array containing the Red, Green, and Blue channel values of the pixel.
 *
 */
function fb_get_pixel(resource = null, x = null, y = null) {
  if (!fb_valid(resource)) {
    return;
  }

  let is_y_nan = (y === null || y === undefined || typeof y !== 'number');

  x |= 0;
  y |= 0;

  let pos = x; // linear access

  if (!is_y_nan) {
    pos = resource.width * y * 4 + x * 4; // flat plane
  }

  return [
    resource.image.data[pos + FB_CHANNEL_R] | 0,
    resource.image.data[pos + FB_CHANNEL_G] | 0,
    resource.image.data[pos + FB_CHANNEL_B] | 0
  ];
}

/**
 * Spawn resource to a container element
 * @param {FBResource} resource Framebuffer Resource
 * @param {Element} container Element to which we spawn
 * @returns {boolean|FBError}
 */
function fb_spawn(resource = null, container = null) {
  let FN_NAME = 'fb_spawn';
  let FN_ARGS = [...arguments];

  if (!fb_valid(resource)) {
    return fb_error(FB_ERR_EXPECTS_RESOURCE, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
  }

  if (container === null || container instanceof Element === false) {
    return fb_error(FB_ERR_EXPECTS_CONTAINER, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
  }

  // TODO: add a try-catch here?
  //       For elements missing the 'append' method.
  container.append(resource.canvas);
  return true;
}

/**
 * Despawn resource from its container
 * @param {FBResource} resource Framebuffer Resource
 * @returns {boolean}
 */
function fb_despawn(resource = null) {
  if (!fb_valid(resource)) {
    return false;
  }

  let parent = resource?.canvas?.parentElement;

  if (parent === null) {
    return false;
  }

  parent?.removeChild(resource?.canvas);

  return true;
}

/**
 * Download resource image as file
 * @param {FBResource} resource Framebuffer Resource
 * @param {String} filename Name of saved file
 * @returns {boolean}
 */
function fb_save(
  resource = null,
  filename = '0.png'
) {
  if (!fb_valid(resource)) {
    return false;
  }

  let anchor = document.createElement('a');
  anchor.href = fb_data_url(resource);
  anchor.download = filename;
  anchor.click();

  return true;
}

/**
 * Draw a rectangle
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} x X axis
 * @param {number} y Y axis
 * @param {number} w Width
 * @param {number} h Height
 * @param {number} r Red channel
 * @param {number} g Green channel
 * @param {number} b Blue channel
 * @param {boolean} fill Fill the area with color
 * @returns {boolean}
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
  if (!fb_valid(resource)) {
    return false
  }

  if (fill) {
    for (let y2 = y; y2 < h + y; y2++) {
      for (let x2 = x; x2 < w + x; x2++) {
        if (resource.width > x2 && resource.height > y2) {
          fb_set_pixel(resource, x2, y2, r, g, b);
        }
      }
    }
  } else {
    let x2 = w + x;
    let y2 = h + y;

    fb_line(resource, x, y, x2 - 1, y, r, g, b);           // top
    fb_line(resource, x, y, x, y2, r, g, b);               // left
    fb_line(resource, x, y2 - 1, x2 - 1, y2 - 1, r, g, b); // bottom
    fb_line(resource, x2 - 1, y, x2 - 1, y2, r, g, b);     // right
  }

  fb_defer(resource);

  return true;
}

/**
 * Draw a circle
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} x X axis
 * @param {number} y Y axis
 * @param {number} w Width
 * @param {number} h Height
 * @param {number} r Red channel
 * @param {number} g Green channel
 * @param {number} b Blue channel
 * @param {number} p Precision of line (clamped from 0.1 to 2) (ignored on fill)
 * @param {boolean} fill Fill the area with color
 * @param {boolean} center Treat X and Y coordinates as middle of the circle
 * @param {number} angles Across what angle to plot the circle
 * @returns {boolean}
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
  if (!fb_valid(resource)) {
    return false;
  }

  let radian = w / 2;

  if (!fill) {
    p = 1 / p;
    p = clamp(p, 0.5, 10); // clamped from 0.5 to 10
    p -= .5;
  }

  // Offset from the center
  if (!center) {
    x += w / 2;
    y += h / 2;
  }

  w = radian / w * 2.016;
  h = radian / h * 2.016;

  for (let angle = 0, x1, y1; angle < angles; angle += 0.05) {
    x1 = radian * Math.cos(angle * (Math.PI / 180)) / w;
    y1 = radian * Math.sin(angle * (Math.PI / 180)) / h;

    // FIXME: Correct logic? Shouldn't we be calling `fb_fill`
    //        and not `fb_line` ???      - imshvc (2024-09-22)
    if (fill) {
      fb_line(resource, x, y, x + x1, y + y1, r, g, b);
      continue;
    }

    if (p > 0) {
      angle += p;
    }

    fb_set_pixel(resource, x + x1, y + y1, r, g, b);
  }

  fb_defer(resource);

  return true;
}

/**
 * Draw a line from point A to point B
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} x1 X axis (point A)
 * @param {number} y1 Y axis (point A)
 * @param {number} x2 X axis (point B)
 * @param {number} y2 Y axis (point B)
 * @param {number} r Red channel
 * @param {number} g Green channel
 * @param {number} b Blue channel
 * @param {number} p Precision of line (clamped from 0.1 to 2)
 * @returns {boolean}
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
  if (!fb_valid(resource)) {
    return false;
  }

  p = clamp(p, 0.1, 2);
  let x = x2 - x1;
  let y = y2 - y1;
  let l = Math.sqrt(x * x + y * y) * p;

  let ax = x / l;
  let ay = y / l;

  x = x1;
  y = y1;

  for (let i = 0; i < l; i += 0.5) {
    if (resource.width > x && resource.height > y) {
      fb_set_pixel(resource, x, y, r, g, b);
    }

    x += ax / 2;
    y += ay / 2;
  }

  fb_defer(resource);

  return true;
}

/**
 * Clear the canvas (default color Black)
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} r Red channel
 * @param {number} g Green channel
 * @param {number} b Blue channel
 * @returns {boolean}
 */
function fb_clear(resource = null, r = 0, g = 0, b = 0) {
  if (!fb_valid(resource)) {
    return false;
  }

  for (let i = 0; i < resource.image.data.length; i += 4) {
    resource.image.data[i + FB_CHANNEL_R] = r;
    resource.image.data[i + FB_CHANNEL_G] = g;
    resource.image.data[i + FB_CHANNEL_B] = b;
  }

  fb_defer(resource);

  return true;
}

/**
 * Verify that the Framebuffer Resource is valid
 * @param {FBResource} resource Framebuffer Resource
 * @returns {boolean}
 */
function fb_valid(resource = null) {
  if (resource === null) {
    return false;
  }

  if (resource instanceof FBResource === false) {
    return false;
  }

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
  ];

  for (let field of fields) {
    if (field in resource === false) {
      return false;
    }
  }

  return true;
}

/**
 * Clone the resource
 * <NoDefer>
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} cri Red channel index (default FB_CHANNEL_R)
 * @param {number} cgi Green channel index (default FB_CHANNEL_G)
 * @param {number} cbi Blue channel index (default FB_CHANNEL_B)
 * @returns {boolean|FBResource} Framebuffer Resource
 */
function fb_copy(
  resource = null,
  cri = FB_CHANNEL_R,
  cgi = FB_CHANNEL_G,
  cbi = FB_CHANNEL_B
) {
  if (!fb_valid(resource)) {
    return false;
  }

  let copy = fb_create(resource.width, resource.height);

  for (let i = 0, j = resource.image.data.length; i < j; i += 4) {
    copy.image.data[i + FB_CHANNEL_R] = resource.image.data[i + cri];
    copy.image.data[i + FB_CHANNEL_G] = resource.image.data[i + cgi];
    copy.image.data[i + FB_CHANNEL_B] = resource.image.data[i + cbi];
  }

  // Synchronize
  copy.context.putImageData(copy.image, 0, 0);

  return copy;
}

/**
 * Create a resource from an asynchronously loaded image
 * <NoDirtyBit>
 * @param {String} path Path or URL to an image
 * @param {Number|Function} width Resource width (-1 for auto), or a callback after load
 * @param {Number|Function} height Resource height (-1 for auto), or a callback after error
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_load(
  path = null, // URL of the image
  width = -1,  // Resource width (-1 for auto)
  height = -1  // Resource height (-1 for auto)
) {
  if (path === null) {
    return null;
  }

  let FN_NAME = 'fb_load';
  let FN_ARGS = [...arguments];

  // Dummy callbacks on default
  let after_load = function() {};
  let after_error = function() {};

  // after load callback
  if (typeof width === 'function') {
    after_load = width;
    width = -1;
  }

  // after error callback
  if (typeof height === 'function') {
    after_error = height;
    height = -1;
  }

  // Dummy resource
  let resource = fb_create(1, 1);
  resource.loaded = false;

  let img = new Image();

  // Event handler
  img.onload = function() {
    if (width == -1) {
      width = img.width;
    }

    if (height == -1) {
      height = img.height;
    }

    // Boundary checks
    if (0 >= width) {
      resource.error = fb_error(FB_ERR_BAD_WIDTH, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
      after_error(resource, path);
      return;
    }

    if (0 >= height) {
      resource.error = fb_error(FB_ERR_BAD_HEIGHT, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
      after_error(resource, path);
      return;
    }

    if (width > FB_MAX_WIDTH) {
      resource.error = fb_error(FB_ERR_LARGE_WIDTH, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
      after_error(resource, path);
      return;
    }

    if (height > FB_MAX_HEIGHT) {
      resource.error = fb_error(FB_ERR_LARGE_HEIGHT, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
      after_error(resource, path);
      return;
    }

    resource.canvas.width = width;
    resource.canvas.height = height;
    resource.width = width;
    resource.height = height;

    fb_draw_source(resource, img, width, height);
    resource.loaded = true;

    after_load(resource, path);
  };

  // Event handler
  img.onerror = function() {
    resource.error = fb_error(FB_ERR_PATH_NOT_FOUND, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
    after_error(resource, path);
  };

  img.src = path;

  return resource;
}

/**
 * Draw the contents from a resource child to the resource parent
 * <NoDefer>
 * @param {FBResource} resource_p Framebuffer Resource we're drawing to (parent)
 * @param {FBResource} resource_c Framebuffer Resource being drawn (child)
 * @param {number} x X axis
 * @param {number} y Y axis
 * @param {number} w Width (-1 is child's width)
 * @param {number} h Height (-1 is child's height)
 * @param {number} ox X axis offset
 * @param {number} oy Y axis offset
 * @returns {boolean}
 */
function fb_draw(
  resource_p,
  resource_c,
  x = 0,
  y = 0,
  w = -1,
  h = -1,
  ox = 0,
  oy = 0
) {
  if (!fb_valid(resource_p)) {
    return false;
  }

  if (!fb_valid(resource_c)) {
    return false;
  }

  w = clamp(w, -1, resource_c.width) | 0;
  h = clamp(h, -1, resource_c.height) | 0;

  x |= 0;
  y |= 0;
  w |= 0;
  h |= 0;
  ox |= 0;
  oy |= 0;

  // Don't draw
  if (w == 0 && h == 0) {
    return false;
  }

  // If width or height are less than or equal to
  // zero we assign each the child's dimensions
  if (w == -1) {
    w = resource_c.width;
  }

  if (h == -1) {
    h = resource_c.height;
  }

  // Synchronize
  resource_p.context.putImageData(resource_c.image, x, y, ox, oy, w, h);
  resource_p.image = resource_p.context.getImageData(0, 0, w, h);
  fb_update(resource_p);

  return true;
}

/**
 * Fill the area with the given color starting from x,y until all
 * occurences of the background color have been replaced in that area.
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} x X axis
 * @param {number} y Y axis
 * @param {number} r Red channel
 * @param {number} g Green channel
 * @param {number} b Blue channel
 * @param {(null|Function)} callback Callback function (default fb_set_pixel)
 * @returns {boolean}
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
  if (!fb_valid(resource)) {
    return false;
  }

  if (callback === null) {
    callback = fb_set_pixel;
  }

  // FIXME: Add a callback check to make sure it's a function
  //        and if not, return an FBError with a built-in
  //        FBErrorDefinition for such a case.

  let bg_color = fb_get_pixel(resource, x, y);

  // Let's not shoot ourselves in the foot
  if (bg_color[0] == r && bg_color[1] == g && bg_color[2] == b) {
    return false;
  }

  let fill_stack = [];
  fill_stack.push([x, y]);

  while (fill_stack.length > 0) {
    let [x, y] = fill_stack.pop();
    let color = fb_get_pixel(resource, x, y);

    if (0 > x || x > resource.width ||
        0 > y || y > resource.height) {
      continue;
    }

    if (color[0] != bg_color[0] ||
        color[1] != bg_color[1] ||
        color[2] != bg_color[2]) {
      continue;
    }

    callback(resource, x, y, r, g, b);

    fill_stack.push([x + 1, y]);
    fill_stack.push([x - 1, y]);
    fill_stack.push([x, y + 1]);
    fill_stack.push([x, y - 1]);
  }

  fb_defer(resource);

  return true;
}

/**
 * Retrieve a specific color channel from a resource
 * Disclaimer: Alpha channel is white if a resource was created.
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} channel Channel index (0=Red, 1=Green, 2=Blue, 3=Alpha) (default 0)
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_get_channel(resource = null, channel = 0) {
  // FIXME: test loaded images with alpha

  if (!fb_valid(resource)) {
    return null;
  }

  channel = clamp(channel, 0, 3);
  return fb_copy(resource, channel, channel, channel);
}

/**
 * Flip image horizontally (X axis)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_flip_x(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  let width = resource.width;
  let height = resource.height;
  let resource_new = fb_create(width, height);

  // FIXME: Linear access implementation?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = fb_get_pixel(resource, x, y);

      // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
      let x2 = Math.abs(width - x) - 1;
      fb_set_pixel(resource_new, x2, y, ...color);
    }
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Flip image vertically (Y axis)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_flip_y(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  let width = resource.width;
  let height = resource.height;
  let resource_new = fb_create(width, height);

  // FIXME: Linear access implementation?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = fb_get_pixel(resource, x, y);

      // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
      let y2 = Math.abs(height - y) - 1;
      fb_set_pixel(resource_new, x, y2, ...color);
    }
  }

  fb_defer(resource); // FIXME: need test

  return resource_new;
}

/**
 * Rotate image right (90 degrees clockwise)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_rotate_right(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  let width = resource.width;
  let height = resource.height;
  let resource_new = fb_create(height, width);

  // FIXME: Linear access implementation?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = fb_get_pixel(resource, x, y);

      // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
      let y2 = Math.abs(height - y) - 1;
      fb_set_pixel(resource_new, y2, x, ...color);
    }
  }

  fb_defer(resource); // FIXME: need test

  return resource_new;
}

/**
 * Rotate image left (90 degrees counterclockwise)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_rotate_left(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  let width = resource.width;
  let height = resource.height;
  let resource_new = fb_create(height, width);

  // FIXME: Linear access implementation?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = fb_get_pixel(resource, x, y);

      // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
      let x2 = Math.abs(width - x) - 1;
      fb_set_pixel(resource_new, y, x2, ...color);
    }
  }

  fb_defer(resource); // FIXME: need test

  return resource_new;
}

/**
 * Replace a specific color in the image
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} pr Red channel (parent)
 * @param {number} pg Green channel (parent)
 * @param {number} pb Blue channel (parent)
 * @param {number} cr Red channel (child)
 * @param {number} cg Green channel (child)
 * @param {number} cb Blue channel (child)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_color_replace(resource = null, pr, pg, pb, cr, cg, cb) {
  if (!fb_valid(resource)) {
    return null;
  }

  let width = resource.width;
  let height = resource.height;
  let resource_new = fb_copy(resource);

  // FIXME: Linear access implementation?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let [r, g, b] = fb_get_pixel(resource, x, y);

      if (r == pr && g == pg &&b == pb) {
        fb_set_pixel(resource_new, x, y, cr, cg ,cb);
      }
    }
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Invert colors of an image
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_color_invert(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  let resource_new = fb_copy(resource);

  for (let i = 0; i < resource.image.data.length; i += 4) {
    resource_new.image.data[i + FB_CHANNEL_R] ^= 255;
    resource_new.image.data[i + FB_CHANNEL_G] ^= 255;
    resource_new.image.data[i + FB_CHANNEL_B] ^= 255;
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Convert image to grayscale
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_color_grayscale(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  let pixelcount = resource.image.data.length;
  let resource_new = fb_create(resource.width, resource.height);

  for (let i = 0; i <= pixelcount; i += 4) {
    let [r, g, b] = fb_get_pixel(resource, i);

    // https://en.wikipedia.org/wiki/Luma_(video)#Use_of_relative_luminance
    let color = (r * 0.21)
              + (g * 0.72)
              + (b * 0.07);

    resource_new.image.data[i + FB_CHANNEL_R] = color;
    resource_new.image.data[i + FB_CHANNEL_G] = color;
    resource_new.image.data[i + FB_CHANNEL_B] = color;
  }

  fb_defer(resource_new);

  return resource_new;
}

/**
 * Convert image to 1-bit
 * @param {FBResource} resource Framebuffer Resource
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_color_1bit(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  let width = resource.width;
  let height = resource.height;
  let resource_new = fb_create(width, height);

  // FIXME: Linear access implementation?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y);

      c = (((c[0] + c[1] + c[2]) / 3) | 0) & 0xFF;
      c = c > 127 ? 255 : 0;

      fb_set_pixel(resource_new, x, y, c, c, c);
    }
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Add grayscale noise to an image
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} scale Amount of noise to add ranging from 0.0 to 10.0 (default 0.1)
 * @returns {(null|Object)} Framebuffer Resource
 */
function fb_noise_grayscale(resource = null, scale = 0.1) {
  if (!fb_valid(resource)) {
    return null;
  }

  scale = clamp(scale, 0, 10);

  let resource_new = fb_copy(resource);

  if (scale == 0) {
    return resource_new;
  }

  let width = resource.width;
  let height = resource.height;

  // FIXME: Linear access implementation?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y);
      let noise = Math.floor(Math.random(0) * (255 * scale)); // FIXME: Try bitwise this

      // FIXME: Do we need clamping here? The Uint8ClampedArray
      //        should automatically handle it, albeit it relies
      //        on the modulo (%) operator, which may yield
      //        incorrect results.
      c[0] = clamp(c[0] + noise, 0, 255);
      c[1] = clamp(c[1] + noise, 0, 255);
      c[2] = clamp(c[2] + noise, 0, 255);

      fb_set_pixel(resource_new, x, y, ...c);
    }
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Add RGB noise to an image
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} scale Amount of noise to add ranging from 0.0 to 10.0 (default 0.1)
 * @returns {null|object} Framebuffer Resource
 */
function fb_noise_rgb(resource = null, scale = 0.1) {
  if (!fb_valid(resource)) {
    return null;
  }

  scale = clamp(scale, 0, 10);

  let resource_new = fb_copy(resource);

  if (scale == 0) {
    return resource_new;
  }

  let width = resource.width;
  let height = resource.height;

  // FIXME: Linear access implementation?
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y);

      // FIXME: Overuse of the Math prototype methods.
      //        We must come up with a better and more
      //        performant approach than this.

      let noise1 = Math.floor(Math.random(0) * (255 * scale));
      let noise2 = Math.floor(Math.random(0) * (255 * scale));
      let noise3 = Math.floor(Math.random(0) * (255 * scale));

      c[0] = clamp(c[0] + noise1, 0, 255);
      c[1] = clamp(c[1] + noise2, 0, 255);
      c[2] = clamp(c[2] + noise3, 0, 255);

      fb_set_pixel(resource_new, x, y, c[0], c[1], c[2]);
    }
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Apply a convolution matrix to an image
 *
 * More information:
 *  - https://en.wikipedia.org/wiki/Kernel_(image_processing)
 *  - https://en.wikipedia.org/wiki/Convolution
 *  - https://docs.gimp.org/2.8/en/plug-in-convmatrix.html
 *
 * @param {FBResource} resource Framebuffer Resource
 * @param {array} matrix Convolution matrix (3x3 or 5x5)
 * @param {number} divisor How much to divide the average result
 * @param {number} offset Value to add to the quotient (division result)
 * @returns {null|FBResource|FBError} Framebuffer Resource
 */
function fb_convolution_matrix(
  resource = null,
  matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0],
  divisor = 1,
  offset = 0
) {
  // FIXME: See if 'Row- and column-major order' matters here.
  //        Ideally we'd want to loop over in row-major order
  //        i.e. (X loop inside Y)
  if (!fb_valid(resource)) {
    return null;
  }

  let FN_NAME = 'fb_convolution_matrix';
  let FN_ARGS = [...arguments];

  // FIXME: Is this limit artificial?
  if (matrix.length != 9 && matrix.length != 25) {
    return fb_error(FB_ERR_CONVOLUTION_MATRIX_SIZE, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
  }

  let resource_new = fb_copy(resource); // FIXME: Why not `fb_create` instead of `fb_copy` ?
  let w = resource.width;
  let h = resource.height;
  let cm = matrix;

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
    // FIXME: Linear access implementation?
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        // 3 x 3 grid
        let a0 = fb_get_pixel(resource, x - 1, y - 1);
        let a1 = fb_get_pixel(resource, x    , y - 1);
        let a2 = fb_get_pixel(resource, x + 1, y - 1);

        let b0 = fb_get_pixel(resource, x - 1, y    );
        let b1 = fb_get_pixel(resource, x    , y    );
        let b2 = fb_get_pixel(resource, x + 1, y    );

        let c0 = fb_get_pixel(resource, x - 1, y + 1);
        let c1 = fb_get_pixel(resource, x    , y + 1);
        let c2 = fb_get_pixel(resource, x + 1, y + 1);

        // Apply convolution matrix
        a0[0] *= cm[0];
        a0[1] *= cm[0];
        a0[2] *= cm[0];

        a1[0] *= cm[1];
        a1[1] *= cm[1];
        a1[2] *= cm[1];

        a2[0] *= cm[2];
        a2[1] *= cm[2];
        a2[2] *= cm[2];

        b0[0] *= cm[3];
        b0[1] *= cm[3];
        b0[2] *= cm[3];

        b1[0] *= cm[4];
        b1[1] *= cm[4];
        b1[2] *= cm[4];

        b2[0] *= cm[5];
        b2[1] *= cm[5];
        b2[2] *= cm[5];

        c0[0] *= cm[6];
        c0[1] *= cm[6];
        c0[2] *= cm[6];

        c1[0] *= cm[7];
        c1[1] *= cm[7];
        c1[2] *= cm[7];

        c2[0] *= cm[8];
        c2[1] *= cm[8];
        c2[2] *= cm[8];

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
        ];

        let pos = w * y * 4 + x * 4;

        resource_new.image.data[pos + FB_CHANNEL_R] = avg[0] + offset;
        resource_new.image.data[pos + FB_CHANNEL_G] = avg[1] + offset;
        resource_new.image.data[pos + FB_CHANNEL_B] = avg[2] + offset;
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
    // FIXME: Linear access implementation?
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        // 5 x 5 grid
        let a0 = fb_get_pixel(resource, x - 2, y - 2);
        let a1 = fb_get_pixel(resource, x - 1, y - 2);
        let a2 = fb_get_pixel(resource, x    , y - 2);
        let a3 = fb_get_pixel(resource, x + 1, y - 2);
        let a4 = fb_get_pixel(resource, x + 2, y - 2);

        let b0 = fb_get_pixel(resource, x - 2, y - 1);
        let b1 = fb_get_pixel(resource, x - 1, y - 1);
        let b2 = fb_get_pixel(resource, x    , y - 1);
        let b3 = fb_get_pixel(resource, x + 1, y - 1);
        let b4 = fb_get_pixel(resource, x + 2, y - 1);

        let c0 = fb_get_pixel(resource, x - 2, y    );
        let c1 = fb_get_pixel(resource, x - 1, y    );
        let c2 = fb_get_pixel(resource, x    , y    );
        let c3 = fb_get_pixel(resource, x + 1, y    );
        let c4 = fb_get_pixel(resource, x + 2, y    );

        let d0 = fb_get_pixel(resource, x - 2, y + 1);
        let d1 = fb_get_pixel(resource, x - 1, y + 1);
        let d2 = fb_get_pixel(resource, x    , y + 1);
        let d3 = fb_get_pixel(resource, x + 1, y + 1);
        let d4 = fb_get_pixel(resource, x + 2, y + 1);

        let e0 = fb_get_pixel(resource, x - 2, y + 2);
        let e1 = fb_get_pixel(resource, x - 1, y + 2);
        let e2 = fb_get_pixel(resource, x    , y + 2);
        let e3 = fb_get_pixel(resource, x + 1, y + 2);
        let e4 = fb_get_pixel(resource, x + 2, y + 2);

        // Apply convolution matrix
        a0[0] *= cm[0];
        a0[1] *= cm[0];
        a0[2] *= cm[0];

        a1[0] *= cm[1];
        a1[1] *= cm[1];
        a1[2] *= cm[1];

        a2[0] *= cm[2];
        a2[1] *= cm[2];
        a2[2] *= cm[2];

        a3[0] *= cm[3];
        a3[1] *= cm[3];
        a3[2] *= cm[3];

        a4[0] *= cm[4];
        a4[1] *= cm[4];
        a4[2] *= cm[4];

        b0[0] *= cm[5];
        b0[1] *= cm[5];
        b0[2] *= cm[5];

        b1[0] *= cm[6];
        b1[1] *= cm[6];
        b1[2] *= cm[6];

        b2[0] *= cm[7];
        b2[1] *= cm[7];
        b2[2] *= cm[7];

        b3[0] *= cm[8];
        b3[1] *= cm[8];
        b3[2] *= cm[8];

        b4[0] *= cm[9];
        b4[1] *= cm[9];
        b4[2] *= cm[9];

        c0[0] *= cm[10];
        c0[1] *= cm[10];
        c0[2] *= cm[10];

        c1[0] *= cm[11];
        c1[1] *= cm[11];
        c1[2] *= cm[11];

        c2[0] *= cm[12];
        c2[1] *= cm[12];
        c2[2] *= cm[12];

        c3[0] *= cm[13];
        c3[1] *= cm[13];
        c3[2] *= cm[13];

        c4[0] *= cm[14];
        c4[1] *= cm[14];
        c4[2] *= cm[14];

        d0[0] *= cm[15];
        d0[1] *= cm[15];
        d0[2] *= cm[15];

        d1[0] *= cm[16];
        d1[1] *= cm[16];
        d1[2] *= cm[16];

        d2[0] *= cm[17];
        d2[1] *= cm[17];
        d2[2] *= cm[17];

        d3[0] *= cm[18];
        d3[1] *= cm[18];
        d3[2] *= cm[18];

        d4[0] *= cm[19];
        d4[1] *= cm[19];
        d4[2] *= cm[19];

        e0[0] *= cm[20];
        e0[1] *= cm[20];
        e0[2] *= cm[20];

        e1[0] *= cm[21];
        e1[1] *= cm[21];
        e1[2] *= cm[21];

        e2[0] *= cm[22];
        e2[1] *= cm[22];
        e2[2] *= cm[22];

        e3[0] *= cm[23];
        e3[1] *= cm[23];
        e3[2] *= cm[23];

        e4[0] *= cm[24];
        e4[1] *= cm[24];
        e4[2] *= cm[24];

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
           e0[2] + e1[2] + e2[2] + e3[2] + e4[2]) / divisor
        ];

        let pos = w * y * 4 + x * 4;

        resource_new.image.data[pos + FB_CHANNEL_R] = avg[0] + offset;
        resource_new.image.data[pos + FB_CHANNEL_G] = avg[1] + offset;
        resource_new.image.data[pos + FB_CHANNEL_B] = avg[2] + offset;
      }
    }
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Sharpen the image
 * @param {FBResource} resource Framebuffer Resource
 * @returns {null|object} Framebuffer Resource
 */
function fb_sharpen(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  let resource_new = fb_convolution_matrix(
    resource,
    [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ]
  );

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Resize the image (using nearest neighbor)
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} w Width (rounded to nearest place)
 * @param {number} h Height (rounded to nearest place)
 * @param {boolean} restore Return resized resource in its original dimension
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_resize(resource = null, w = 0, h = 0, restore = false) {
  if (!fb_valid(resource)) {
    return null;
  }

  w |= 0;
  h |= 0;

  // If the dimensions have not changed,
  // return the affectee resource
  if (w == 0 || w == resource.width &&
      h == 0 || h == resource.height) {
    return resource;
  }

  // Keep original dimensions
  let w_copy = resource.width;
  let h_copy = resource.height;

  let resource_new = fb_create(w, h);

  // Difference values between resource
  // and resource_new dimensions
  //
  // FIXME: Should we truncate the integer?
  //        This way we might get a performance boost,
  //        but also lose some precision in the resizing
  //        algorithm (right?)     - imshvc (2024-09-22)
  xd = w_copy / w;
  yd = h_copy / h;

  // FIXME: Linear access implementation?
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let color = fb_get_pixel(resource, xd * x, yd * y);

      for (let i = 0; i < xd; i += xd) {
        for (let j = 0; j < yd; j += yd) {
          fb_set_pixel(resource_new, x + i, y + j, ...color);
        }
      }
    }
  }

  fb_sync(resource_new);

  if (restore) {
    return fb_resize(resource_new, w_copy, h_copy);
  }

  return resource_new;
}

/**
 * Pixelate an image
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} factor How much to divide image dimensions before upsampling (default 2, min 1)
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_pixelate(resource = null, factor = 2) {
  if (!fb_valid(resource)) {
    return null;
  }

  // Factor min can be 1
  factor = clamp(factor, 1) | 0; // FIXME: Is this correct?

  let resource_new = fb_copy(resource);

  // If factor is 1 return the affectee resource
  if (factor == 1) {
    return resource_new;
  }

  // Original dimensions
  let ow = resource.width;
  let oh = resource.height;

  // Sampled dimensions
  let sw = clamp((ow / factor) | 0, 1);
  let sh = clamp((oh / factor) | 0, 1);

  // Downsample and upsample using nearest neighbor
  resource_new = fb_resize(resource_new, sw, sh);
  resource_new = fb_resize(resource_new, ow, oh);

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
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
 * @param {number} x1 X axis (Point 1)
 * @param {number} y1 Y axis (Point 1)
 * @param {number} x2 X axis (Point 2)
 * @param {number} y2 Y axis (Point 2)
 * @param {number} mode If 1, values [x2, y2] are used as width and height
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_crop(resource = null, x1 = 0, y1 = 0, x2 = 1, y2 = 1, mode = 0) {
  if (!fb_valid(resource)) {
    return null;
  }

  // FIXME: Maybe we can yield better performance if we implement this ourselves in bitwise?
  x1 = Math.abs(x1) | 0;
  y1 = Math.abs(y1) | 0;
  x2 = Math.abs(x2) | 0;
  y2 = Math.abs(y2) | 0;

  mode = clamp(mode, 0, 1);

  let w, h;

  // Mode 0
  if (mode == 0) {
    // Save people from making pesky mistakes
    if (x1 == x2) {
      ++x2;
    }

    if (y1 == y2) {
      ++y2;
    }

    // Point #1 is bigger than Point #2
    // swap their values
    if (x1 > x2) {
      [x1, x2] = [x2, x1];
    }

    if (y1 > y2) {
      [y1, y2] = [y2, y1];
    }

    // Point #2 must be within the dimension boundaries of the resource
    x2 = clamp(x2, 0, resource.width);
    y2 = clamp(y2, 0, resource.height);

    // Set width and height
    w = (x2 - x1) | 0;
    h = (y2 - y1) | 0;
  }

  // Mode 1
  if (mode == 1) {
    // Set width and height
    w = x2;
    h = y2;
  }

  let resource_new = fb_create(w, h);
  let mx = w + x1;
  let my = h + y1;

  for (let x = x1; x < mx; x++)
    for (let y = y1; y < my; y++) {
      let color = fb_get_pixel(resource, x, y);

      fb_set_pixel(
        resource_new,
        x - x1,
        y - y1,
        ...color
      );
    }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Detect edges in an image
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} mode Available modes [0..2]
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_detect_edge(resource = null, mode = 0) {
  if (!fb_valid(resource)) {
    return null;
  }

  mode = clamp(mode, 0, 2);

  let resource_new = fb_copy(resource);

  // Mode 0
  if (mode == 0) {
    resource_new = fb_convolution_matrix(
      resource_new,
      [
        1,  0, -1,
        0,  0,  0,
       -1,  0,  1
      ]
    );
  }

  // Mode 1
  if (mode == 1) {
    resource_new = fb_convolution_matrix(
      resource_new,
      [
        0,  1,  0,
        1, -4,  1,
        0,  1,  0
      ]
    );
  }

  // Mode 2
  if (mode == 2) {
    resource_new = fb_convolution_matrix(
      resource_new,
      [
       -1, -1, -1,
       -1,  8, -1,
       -1, -1, -1
      ]
    )
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Box blur
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} iterations Iteration count (min 1)
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_blur_box(resource = null, iterations = 1) {
  if (!fb_valid(resource)) {
    return null;
  }

  let resource_new = fb_copy(resource);
  iterations = clamp(iterations, 1);

  for (let i = 0; i < iterations; i++) {
    resource_new = fb_convolution_matrix(
      resource_new,
      [
        1,  1,  1,
        1,  1,  1,
        1,  1,  1
      ],
      9
    );
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Gaussian blur
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} iterations Iteration count (min 1)
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_blur_gaussian(resource = null, iterations = 1) {
  if (!fb_valid(resource)) {
    return null;
  }

  let resource_new = fb_copy(resource);
  iterations = clamp(iterations, 1);

  for (let i = 0; i < iterations; i++) {
    resource_new = fb_convolution_matrix(
      resource_new,
      [
        1,  2,  1,
        2,  4,  2,
        1,  2,  1
      ],
      16
    );
  }

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Emboss
 * @param {FBResource} resource Framebuffer Resource
 * @param {number} power How many times to apply the convolution matrix (min 0.01)
 * @returns {null|FBResource} Framebuffer Resource
 */
function fb_emboss(resource = null, power = 1) {
  if (!fb_valid(resource)) {
    return null;
  }

  power = clamp(power, 0.01);

  let resource_new = fb_convolution_matrix(
    resource_new,
    [
     -2 * power, -1 * power,  0 * power,
     -1 * power,  1 * power,  1 * power,
      0 * power,  1 * power,  2 * power
    ],
    9
  );

  fb_defer(resource_new); // FIXME: need test

  return resource_new;
}

/**
 * Block modifications to the Framebuffer Resource (lock)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {boolean}
 */
function fb_lock(resource = null) {
  if (!fb_valid(resource)) {
    return false;
  }

  resource.locked = true;
  return true;
}

/**
 * Allow modifications to the Framebuffer Resource (unlock)
 * @param {FBResource} resource Framebuffer Resource
 * @returns {boolean}
 */
function fb_unlock(resource = null) {
  if (!fb_valid(resource)) {
    return false;
  }

  resource.locked = false;
  return true;
}

/**
 * Replace a Framebuffer Resource with a different one
 * This function synchronizes automatically
 * <NoDefer>
 * @param {FBResource} resource_p Framebuffer Resource (parent)
 * @param {FBResource} resource_c Framebuffer Resource (child)
 * @return {boolean}
 */
function fb_replace(resource_p = null, resource_c = null) {
  if (!fb_valid(resource_p)) {
    return false;
  }

  if (!fb_valid(resource_c)) {
    return false;
  }

  let cw = resource_c.width;
  let ch = resource_c.height;

  resource_p.canvas.width = cw;
  resource_p.canvas.height = ch;
  resource_p.width = cw;
  resource_p.height = ch;

  // Synchronize
  resource_p.context.putImageData(resource_c.image, 0, 0);
  resource_p.image = resource_p.context.getImageData(0, 0, cw, ch);
  fb_update(resource_p);

  return true;
}

/**
 * Alias for 'drawImage' and 'getImageData'.
 * <InternalFunction, NoDefer>
 * @param {FBResource} resource Framebuffer Resource (parent)
 * @param {Element|object} source Source Element (see drawImage MDN Docs)
 * @param {number} source_width
 * @param {number} source_height
 * @return {boolean}
 */
function fb_draw_source(
  resource = null,
  source = null,
  source_width = null,
  source_height = null
) {
  if (!fb_valid(resource)) {
    return false;
  }

  if (source === null) {
    return false;
  }

  if (source_width === null) {
    return false;
  }

  if (source_height === null) {
    return false;
  }

  // Synchronize
  resource.context.drawImage(source, 0, 0, source_width, source_height);
  resource.image = resource.context.getImageData(0, 0, source_width, source_height);
  fb_update(resource);
  // TODO: Do we need fb_sync() instead?
  // TODO: 
  // TODO: It calls putImageData which is sort
  // TODO: of synonymous with drawImage above

  return true;
}

/**
 * Defer-bit handler.
 * <InternalFunction>
 * @param {FBResource} resource Framebuffer Resource
 * @returns {undefined}
 */
function fb_defer(resource = null) {
  if (!fb_valid(resource)) {
    return;
  }

  // Defer disabled - synchronize
  if (resource.defer == FB_DEFER_WRITE_THROUGH) {
    fb_sync(resource);
  }
}

/**
 * Configuration getter/setter.
 * Disclaimer: Always check against FB_ERR_BAD_CFG_* constants (user-code)
 * <PolymorphicFunction>
 * @param {string} key Configuration key
 * @param {mixed} value Value key (use '<default>' to assign default value)
 * @returns {mixed} True when value set (undefined on invalid key)
 */
function fb_config(key = null, value = undefined) {
  if (key === null) {
    return;
  }

  let FN_NAME = 'fb_config';
  let FN_ARGS = [...arguments];

  // Invalid key
  if (!fb_config_map_keys.includes(key)) {
    return fb_error(FB_ERR_BAD_CFG_KEY, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
  }

  // Get current key value
  if (value === undefined) {
    return fb_config_map[key].value;
  }

  // Set default value
  if (value === '<default>') {
    if ('_set' in fb_config_map[key]) {
      fb_config_map[key]._set(
        fb_config_map[key].default,
        fb_config_map[key]
      );
    } else {
      fb_config_map[key].value = fb_config_map[key].default;
    }

    return true;
  }

  // Check if value is allowed
  if (!fb_config_map[key].allowed.includes(value)) {
    return fb_error(FB_ERR_BAD_CFG_VALUE, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
  }

  // Set key value
  if ('_set' in fb_config_map[key]) {
    fb_config_map[key]._set(
      value,
      fb_config_map[key]
    );
  } else {
    fb_config_map[key].value = value;
  }

  return true;
}

/**
 * Get default value for a configuration key
 * Disclaimer: Always check against FB_ERR_BAD_CFG_* constants (user-code)
 * @param {string} key Configuration key
 * @returns {string|number|null|undefined|FBError} Default value (undefined on invalid key)
 */
function fb_config_default(key = null) {
  if (key === null) {
    return;
  }

  let FN_NAME = 'fb_config_default';
  let FN_ARGS = [...arguments];

  key = key.toLowerCase();

  if (fb_config_map_keys.includes(key)) {
    return fb_config_map[key].default;
  }

  return fb_error(FB_ERR_BAD_CFG_KEY, FB_ORIGIN_SYSTEM, FN_NAME, FN_ARGS);
}

/**
 * Synchronize resource configurations with
 * the global values in 'fb_config_map'.
 * <StubFunction>
 * TODO: Implement fb_sync_config
 * @returns {FBError}
 */
function fb_sync_config() {
  return fb_error(
    FB_ERR_STUB_FUNCTION,
    FB_ORIGIN_SYSTEM,
    'fb_sync_config',
    [...arguments]
  );
}

/**
 * Get framebuffer.js version
 * Returns ISO 8601 (YYYY-MM-DD) on empty format
 * @param {null|string} format Format to use ($Y, $M, and $D is replaced with YEAR, MONTH, and DAY)
 * @returns {string}
 */
function fb_version(format = null) {
  let y = FB_VERSION_YEAR;
  let m = String(FB_VERSION_MONTH).padStart(2, '0');
  let d = String(FB_VERSION_DAY).padStart(2, '0');

  if (format === null) {
    return y + '-' + m + '-' + d;
  }

  format = format.replace(/\$Y/g, y)
                 .replace(/\$M/g, m)
                 .replace(/\$D/g, d);

  return format;
}

/**
 * Hook a function
 * @param {String} func Function name
 * @param {number} hook_func Hooked function
 * @param {boolean} active Activate hook on creation
 * @returns {(String|Boolean|FBError)}
 */
function fb_hook(func = null, hook_func = null, active = true) {
  if (func === null) {
    return false;
  }

  // Not a string
  if (typeof func !== 'string') {
    return false;
  }

  // Function is blacklisted from being hooked via library methods
  if (fb_hook_blacklist.includes(func)) {
    return fb_error(
      FB_ERR_FUNC_BLACKLISTED,
      FB_ORIGIN_SYSTEM,
      'fb_hook',
      [...arguments]
    );
  }

  // Function already hooked
  //
  // 'true' because it's already hooked
  // no error checks need to be done
  if (fb_hooked(func)) {
    return true;
  }

  // Initialize hook store
  fb_hooked_functions[func] = {
    active: false,
    original: window[func],
    hooked: hook_func
  };

  fb_hooked_functions[func].hooked.name = func;

  // Reference to the hook
  window[func] = fb_hooked_functions[func].original;

  // Activate hook on creation
  if (active) {
    fb_hook_enable(func);
  }

  return true;
}

/**
 * Is the function hook enabled?
 * @param {String} func Function name
 * @returns {boolean}
 */
function fb_hook_active(func = null) {
  return fb_hooked(func) && fb_hooked_functions[func].active;
}

/**
 * Call original function from a hook.
 * Used inside fb_hook()'s callback function.
 * @param {String} func Function name
 * @param {array} args Array of arguments
 * @returns {boolean}
 */
function fb_hook_call(func = null, args = []) {
  if (func === null) {
    return false;
  }

  // Not a string
  if (typeof func !== 'string') {
    return false;
  }

  // Not hooked
  if (!fb_hooked(func)) {
    return false;
  }

  // Call function
  return fb_hooked_functions[func].original(...args);
}

/**
 * Disable function hook
 * @param {String} func Function name
 * @returns {boolean}
 */
function fb_hook_disable(func = null) {
  // Not hooked
  if (!fb_hooked(func)) {
    return false;
  }

  // Disable hook
  fb_hooked_functions[func].active = false;
  window[func] = fb_hooked_functions[func].original;

  return true;
}

/**
 * Enable function hook
 * @param {String} func Function name
 * @returns {boolean}
 */
function fb_hook_enable(func = null) {
  // Not hooked
  if (!fb_hooked(func)) {
    return false;
  }

  // Enable hook
  fb_hooked_functions[func].active = true;
  window[func] = fb_hooked_functions[func].hooked;

  return true;
}

/**
 * Check to see that a function is hooked
 * @param {String} func Function name
 * @returns {boolean}
 */
function fb_hooked(func = null) {
  if (func === null) {
    return false;
  }

  // Not a string
  if (typeof func !== 'string') {
    return false;
  }

  return func in fb_hooked_functions;
}

/**
 * Unhook a function
 * @param {String} func Function name
 * @returns {boolean}
 */
function fb_unhook(func = null) {
  // Not hooked
  if (!fb_hooked(func)) {
    return false;
  }

  // Restore original function
  window[func] = fb_hooked_functions[func].original;

  // Delete hook
  delete fb_hooked_functions[func];

  return true;
}

/**
 * Hook helper: Print function arguments
 * @param {String} func Function name
 * @param {array} args Array of arguments passed to a function
 * @returns {String} Function call output
 */
function fb_hook_log_args(func = null, args = null, returned = null) {
  if (func === null) {
    return;
  }

  let result = func + '(';

  for (let i in args) {
    let arg = args[i];

    if (i > 0 && i < args.length) {
      result += ', ';
    }

    switch (typeof arg) {
      default:
      case 'number':
        result += arg;
        break;

      case 'string':
        result += '"' + arg + '"';
        break;

      case 'object':
        if (arg instanceof Array) {
          result += '[Array (' + arg.length + ' items)]';
        } else {
          result += '[Object (' + Object.keys(arg).length + ' items)]';
        }
        break;
    }

    if (i + 1 > args.length) {
      result += ') = ' + returned;
      break;
    }
  }

  return result;
}

/**
 * Generate Data URL for the Resource image.
 * @param {FBResource} resource Framebuffer Resource
 * @returns {String|null} Data URL
 */
function fb_data_url(resource = null) {
  if (!fb_valid(resource)) {
    return null;
  }

  return resource.canvas.toDataURL();
}

/**
 * Add resource reference to the resource list
 * @param {FBResource} resource Framebuffer Resource
 * @returns {boolean}
 */
function fb_resource_list_add(resource = null) {
  // Disabled by configuration
  if (!fb_config('resource_list')) {
    return false;
  }

  if (!fb_valid(resource)) {
    return false;
  }

  window.fb_resource_list.push(resource);
  return true;
}

/**
 * Filter created resources by their property values.
 * Multiple filters allowed. Including callbacks.
 * @param {...object|...FBError} var_args Objects to filter against resource objects
 * @returns {object|FBError}
 */
function fb_resource_list_filter(var_args) {
  if (!fb_config('resource_list')) {
    return;
  }

  // TODO: implement fb_resource_list_filter
}

/**
 * Generate an error (or check if value is one)
 * <PolymorphicFunction>
 * @param {string|FBError|FBErrorDefinition} data Error description, FBError, or FBResource object.
 * @param {number|null} origin Error Origin (System, User)
 * @param {null|string} func Function name that caused the error (optional)
 * @param {null|array} args Arguments of the function that caused the error (optional)
 * @returns {FBError|boolean} FBError is returned on error creation
 */
function fb_error(data = null, origin = null, func = null, args = null) {
  if (data === null) {
    return false;
  }

  // Error check
  if (data instanceof FBError) {
    return true;
  }

  // Empty error instance we set-up
  let error = new FBError();

  // Resource check
  if (data instanceof FBResource) {
    return fb_error(data.error);
  }

  let is_error_definition = data instanceof FBErrorDefinition;

  // Built-in error check
  if (is_error_definition) {
    error.text = data.text;
    error.id = data.id;
    error.origin = origin ?? FB_ORIGIN_SYSTEM;
  }

  // Not string
  if (!is_error_definition && typeof data !== 'string') {
    data = '';
  }

  // String inputs are always user generated
  if (typeof data === 'string') {
    data = data.trim();
    error.text = data;
    error.origin = origin ?? FB_ORIGIN_USER; // NOTE: Should we enforce FB_ORIGIN_USER ?
    error.id = 'FB_ERR_USER_GENERATED';
  }

  // Logging enabled
  if (fb_config('error_log')) {
    window.fb_errors.push(error);
  }

  if (func !== null) {
    error.func.name = func;
  }

  if (args !== null) {
    error.func.args = args;
  }

  return error;
}

/**
 * List/filter Framebuffer JS functions
 * @param {String} var_args Strings to filter against function names
 * @returns {Array}
 */
function fb_list_functions(var_args) {
  let filters = [...arguments];
  let list = {};

  // for each 'key' in window
  for (let k in window) {

    // if k starts with 'fb_' and is a function
    if (k.startsWith('fb_') && typeof window[k] === 'function') {

      // filters specified, need to loop
      if (filters.length > 0) {
        for (let str of filters) {
          // function name contains 'str' from 'filters'
          if (k.includes(str)) {
            list[k] = 0;
          }
        }

        // continue to next filter item
        continue;
      }

      // no filter specified
      list[k] = 0;
    }
  }

  return Object.keys(list);
}

/**
 * Get last error that was logged
 * @returns {FBError|null}
 */
function fb_get_last_error() {
  let errors = window.fb_errors;

  if (errors.length == 0) {
    return null;
  }

  if (!fb_config('error_log')) {
    return null;
  }

  return errors[errors.length - 1];
}

/**
 * Clear error log
 * @returns {undefined}
 */
function fb_clear_errors() {
  window.fb_errors.length = 0;
}

/**
 * Describe the text tied to an Error ID.
 * Don't use this to return user-generated error 'text' contents,
 * that's not how it works.
 * @param {String|FBError|FBErrorDefinition|FBResource} data Error ID, FBError, FBErrorDefinition, or FBResource Object
 * @returns {String} Empty string means could not describe the error
 */
function fb_describe_error(data = null) {
  if (data === null) {
    return '';
  }

  if (data instanceof FBErrorDefinition) {
    return data.text;
  }

  if (data instanceof FBError) {
    return fb_describe_error(data.id);
  }

  if (data instanceof FBResource) {
    return fb_describe_error(data.error);
  }

  if (typeof data !== 'string') {
    return '';
  }

  if (data.length < 7 || data.toUpperCase().substring(0, 7) != 'FB_ERR_') {
    return '';
  }

  let errors = window.fb_error_defs;

  if (data in errors && errors[data] instanceof FBErrorDefinition && 'text' in errors[data]) {
    return errors[data].text;
  }

  return '';
}

/**
 * Trim empty space around the image
 * <StubFunction>
 * @param {FBResource} resource Framebuffer Resource
 * @returns {FBError}
 */
function fb_trim(resource = null) {
  // TODO: Implement fb_trim
  return fb_error(
    FB_ERR_STUB_FUNCTION,
    FB_ORIGIN_SYSTEM,
    'fb_trim',
    [...arguments]
  );
}

/**
 * Get a 1-dimensional integer representing the
 * X and Y position of a pixel in a 32-bit image.
 * <InternalFunction, BackwardCompatibility, NotUsed>
 * @param {Number} w Width
 * @param {Number} x X axis
 * @param {Number} y Y axis
 * @returns {Number} Index pointing at pixel on X and Y coordinates
 */
function fb_getpos(w = 0, x = 0, y = 0) {
  return w * (y | 0) * 4 + (x | 0) * 4;
}

/**
 * Convert various color representations to
 * a color format understood by the library.
 * <InternalFunction>
 * @param {number} color RGB value represented as an integer
 * @returns {array} Array indexed from 0 to 2 as R,G,B
 */
function fb_rgb(color = 0) {
  return [
    color >> 16 & 0xFF, // red channel
    color >>  8 & 0xFF, // green channel
    color       & 0xFF  // blue channel
  ];
}

/**
 * Clamp a value between low and high
 * @param {number} v Value
 * @param {number} l Lowest possible value
 * @param {number} h Highest possible value
 * @returns {number} Clamped value
 */
function clamp(v, l, h) {
  if (l > v) return l;
  if (h < v) return h;
             return v;
}

/**
 * Return a UNIX timestamp
 * @returns {number}
 */
function time() {
  return (+Date.now() / 1000) | 0;
}

/**
 * Return a UNIX timestamp with miliseconds
 * @returns {number}
 */
function time_precise() {
  return +Date.now();
}

/**
 * Pseudo-random number generator
 * @param {number} count How many numbers to concatenate [1..10]
 * @returns {number}
 */
function rand(count = 10) {
  count |= 0;

  if (0 >= count) {
    count = 1;
  }

  if (count > 10) {
    count = 10;
  }

  let accum = '';

  while (1) {
    let num = Math.random() * 10 | 0;

    if (0 >= num) {
      continue;
    }

    accum += num;

    if (!--count) {
      break;
    }
  }

  return +accum;
}

/**
 * Sleep for miliseconds
 * @param {number} ms
 * @returns {undefined}
 */
function sleep(ms) {
  if (0 >= ms) {
    return;
  }

  let start = Date.now();

  do {} while (ms > (Date.now() - start));
}

/**
 * Returns true if N is between or equal to A or B.
 * @param {number} n Initial number
 * @param {number} a Low number
 * @param {number} b High number
 * @returns {boolean}
 */
function in_range(n, a, b) {
  return n >= a && n <= b;
}

/**
 * Linear interpolation.
 * @param {number} a Point A
 * @param {number} b Point B
 * @param {number} t Time
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Safe division, protect against division by zero.
 * Returns the initial number if divisor >= 0
 * @param {number} n Initial number
 * @param {number} div Divisor
 * @returns {number} Quotient
 */
function safe_div(n = 0, div = 0) {
  if (n == 0) {
    return n;
  }

  if (div == 0) {
    return n;
  }

  return n / div;
}

/**
 * Returns true if a character is a number.
 * @param {string} ch Character or a full string
 * @returns {boolean}
 */
function is_digit(ch = '') {
  if (ch.length > 1) {
    for (let c of ch) {
      if (c.length > 1) {
        return false; // UTF-16
      }

      if (!is_digit(c)) {
        return false; // string contains other characters
      }
    }

    return true; // string contains only numbers
  }

  let dec = ch?.charCodeAt(0);

  return dec >= 48 && dec <= 57;
}

/**
 * Returns true if a character is an alphabet letter
 * ASCII only.
 * @param {string} ch Character or a full string (ASCII)
 * @returns {boolean}
 */
function is_alpha(ch = '') {
  if (ch.length > 1) {
    for (let c of ch) {
      if (c.length > 1) {
        return false; // UTF-16
      }

      if (!is_alpha(c)) {
        return false; // string contains other characters
      }
    }

    return true; // string contains only letters
  }

  let dec = ch?.charCodeAt(0);

  return dec >= 65 && dec <= 90 || // uppercase
         dec >= 97 && dec <= 122;  // lowercase
}

/**
 * Character is not a number nor a letter.
 * It's outside those ranges.
 * ASCII only.
 * @param {string} ch Character or a full string (ASCII)
 * @returns {boolean}
 */
function is_special(ch = '') {
  if (ch.length > 1) {
    for (let c of ch) {
      if (c.length > 1) {
        return false; // UTF-16
      }

      if (!is_special(c)) {
        return false; // string contains other characters
      }
    }

    return true; // string contains only special characters
  }

  return !is_digit(ch) && !is_alpha(ch)
}

/**
 * Is the string ASCII (7-bit).
 * @param {string} input
 * @returns {boolean}
 */
function is_ascii(input = '') {
  if (input.length > 1) {
    for (let ch of input) {
      if (ch.length > 1) {
        return false; // UTF-16
      }

      if (!is_ascii(ch)) {
        return false;
      }
    }

    return true; // string is ASCII (7-bit)
  }

  return is_digit(input) || is_alpha(input) || is_special(input);
}

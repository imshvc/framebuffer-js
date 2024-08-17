// Author: Nurudin Imsirovic <realnurudinimsirovic@gmail.com>
// JavaScript Library: Abstraction Layer For 2D Canvas
// Created: 2024-05-01 08:34 PM
// Updated: 2024-08-18 01:42 AM

// Source: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
var FB_CANVAS_CONTEXT_ATTRIBUTES = {
  // A boolean value that indicates if the canvas contains an alpha channel.
  // If set to 'false', the browser now knows that the backdrop is always opaque,
  // which can speed up drawing of transparent content and images.
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
const FB_MAX_ALLOWED_WIDTH = 65535
const FB_MAX_ALLOWED_HEIGHT = 65535

// Color channel offsets
const FB_IMAGEDATA_CHANNEL_R = 0
const FB_IMAGEDATA_CHANNEL_G = 1
const FB_IMAGEDATA_CHANNEL_B = 2
const FB_IMAGEDATA_CHANNEL_A = 3

// Resources created asynchronously
var fb_async_resources = {}

// Create a Framebuffer Object
function fb_create(width, height) {
  // Convert to decimal
  width |= 0
  height |= 0

  // Boundary checks
  if (0 >= width)
    throw 'width less than or equal to zero (0 >= width)'

  if (0 >= height)
    throw 'width less than or equal to zero (0 >= height)'

  if (width > FB_MAX_ALLOWED_WIDTH)
    throw 'width larger than allowed size (>' + FB_MAX_ALLOWED_WIDTH + ')'

  if (height > FB_MAX_ALLOWED_HEIGHT)
    throw 'height larger than allowed size (>' + FB_MAX_ALLOWED_HEIGHT + ')'

  let resource = {
    canvas: null,
    width: width,
    height: height,
    context: null,
    image: null,
    loaded: true,
    locked: false,
  }

  resource.canvas = document.createElement('canvas')
  resource.canvas.width = width
  resource.canvas.height = height

  resource.context = resource.canvas.getContext(
    '2d', FB_CANVAS_CONTEXT_ATTRIBUTES
  )

  resource.image = new ImageData(width, height)

  // Fix alpha issue on non-alpha canvas by setting it to 255
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let pos = fb_getpos(width, height, x, y)
      resource.image.data[pos + FB_IMAGEDATA_CHANNEL_A] = 255
    }
  }

  return resource
}

// Synchronize ImageData to the Canvas
function fb_sync(resource) {
  resource.context.putImageData(resource.image, 0, 0)
}

// Get X and Y position from bytes of a 32-bit image
function fb_getpos(w, h, x, y, flip = false) {
  x = Math.round(x) * 4
  y = Math.round(y) * 4

  // flip the Y axis upside-down
  if (flip)
    y = Math.abs(y - (h * 4) + 4)

  return w * y + x
}

// Set pixel color at XY coord
function fb_set_pixel(resource, x, y, r, g, b) {
  resource = fb_resolve(resource)

  if (resource.locked)
    return

  // All values to decimals
  x |= 0
  y |= 0
  r |= 0
  g |= 0
  b |= 0

  let pos = fb_getpos(resource.width, resource.height, x, y)

  resource.image.data[pos + FB_IMAGEDATA_CHANNEL_R] = r
  resource.image.data[pos + FB_IMAGEDATA_CHANNEL_G] = g
  resource.image.data[pos + FB_IMAGEDATA_CHANNEL_B] = b
}

// Get pixel color at XY coord
function fb_get_pixel(resource, x, y, r, g, b) {
  resource = fb_resolve(resource)

  let pos = fb_getpos(resource.width, resource.height, x, y)

  return [
    resource.image.data[pos + FB_IMAGEDATA_CHANNEL_R],
    resource.image.data[pos + FB_IMAGEDATA_CHANNEL_G],
    resource.image.data[pos + FB_IMAGEDATA_CHANNEL_B],
  ]
}

// Spawn resource to a container element
function fb_spawn(resource, container = null) {
  if (container === null)
    throw 'fb_spawn expects container to be an element (got null)'

  container.append(resource.canvas)
}

// Download resource image as file
function fb_save(resource, filename = '0.png') {
  let anchor = document.createElement('a')
  anchor.href = resource.canvas.toDataURL()
  anchor.download = filename
  anchor.click()
}

// Plot a rectangle
function fb_rect(
  resource,    // Framebuffer resource
  x = 0,       // Position X
  y = 0,       // Position Y
  w = 10,      // Width
  h = 10,      // Height
  r = 255,     // Color channel Red
  g = 255,     // Color channel Green
  b = 255,     // Color channel Blue
  fill = false // Fill the area with color
) {
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

  return true
}

// Plot a circle
function fb_circle(
  resource,       // Framebuffer resource
  x,              // Position X
  y,              // Position Y
  w,              // Width
  h,              // Height
  r,              // Color channel Red
  g,              // Color channel Green
  b,              // Color channel Blue
  p      = 1,     // Precision of line (clamped from 0.1 to 2) (ignored on fill)
  fill   = false, // Fill the area with color
  center = false, // Treat X and Y as the center point of the circle
  angles = 360    // Across what angle to plot the circle
) {
  let radian = w / 2

  if (!fill) {
    p = 1 / p
    p = clamp(p, 0.5, 10) // clamped from 0.1 to 2
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
    x1 = radian * Math.cos(deg2rad(angle)) / w
    y1 = radian * Math.sin(deg2rad(angle)) / h

    if (fill) {
      fb_line(resource, x, y, x + x1, y + y1, r, g, b)
    } else {
      if (p > 0)
        angle += p

      fb_set_pixel(resource, x + x1, y + y1, r, g, b)
    }
  }

  return true
}

// Plot a line from point A to B
function fb_line(
  resource, // Framebuffer resource
  x1,       // Position X #1
  y1,       // Position Y #1
  x2,       // Position X #2
  y2,       // Position Y #2
  r = 255,  // Color channel Red
  g = 255,  // Color channel Green
  b = 255,  // Color channel Blue
  p = 1     // Precision of line (clamped from 0.1 to 2)
) {
  p = clamp(p, 0.1, 2) // NOTE: Should we even be clamping this value?
  let x = x2 - x1
  let y = y2 - y1
  let l = Math.sqrt(x * x + y * y) * p

  let ax = x / l
  let ay = y / l

  x = x1
  y = y1

  for (let i = 0; i < l; i++) {
    if (resource.width > x && resource.height > y)
      fb_set_pixel(resource, x, y, r, g, b)

    x += ax
    y += ay
  }

  return true
}

// Clear everything from the bitmap (by default using Black color)
function fb_clear(
  resource, // Framebuffer resource
  r = 0,    // Color channel Red
  g = 0,    // Color channel Green
  b = 0,    // Color channel Blue
) {
  for (let y = 0; y < resource.height; y++)
    for (let x = 0; x < resource.width; x++)
      fb_set_pixel(resource, x, y, r, g, b)

  return true
}

// Verify that the Framebuffer resource is valid
function fb_valid(
  resource = null // Framebuffer resource
) {
  if (resource === null)
    return false

  if (typeof resource !== 'object')
    return false

  if (resource.length == 0)
    return false

  let fields = [
    'canvas',
    'context',
    'height',
    'image',
    'width',
    'locked',
    'loaded',
  ]

  for (let field of fields)
    if (!(field in resource))
      return false

  return true
}

// Clone the resource
function fb_copy(
  resource, // Framebuffer resource
  cri = 0,  // Channel Red Index
  cgi = 1,  // Channel Green Index
  cbi = 2   // Channel Blue Index
) {
  if (!fb_valid(resource))
    return false

  let copy = fb_create(resource.width, resource.height)

  for (let i = 0, j = resource.image.data.length; i < j;) {
    copy.image.data[i + 0] = resource.image.data[i + cri]
    copy.image.data[i + 1] = resource.image.data[i + cgi]
    copy.image.data[i + 2] = resource.image.data[i + cbi]
    i += 4
  }

  // Automatically synchronize
  fb_sync(copy)

  return copy
}

// Create a resource from an asynchronously loaded image
function fb_load(
  url = null,  // URL of the image
  width = -1,  // Resource width (-1 for auto)
  height = -1, // Resource height (-1 for auto)
) {
  if (url === null)
    return null

  let id = fb_gen_resource_id()
  let resource = fb_create(1, 1) // dummy resource
  resource.loaded = false

  fb_async_resources[id] = resource

  let img = new Image()

  img.onload = function() {
    if (width == -1)
      width = img.width

    if (height == -1)
      height = img.height

    resource = fb_create(width, height)
    resource.context.drawImage(img, 0, 0)
    resource.image = resource.context.getImageData(0, 0, width, height)

    fb_async_resources[id] = resource
  }

  img.src = url

  return 'id:' + id
}

// Resolve a resource id to its object
function fb_resolve(id = null) {
  if (id === null)
    return null

  // Return actual resources back (expected behavior)
  if (fb_valid(id))
    return id

  if (typeof id !== 'string')
    return null

  if (id.substring(0, 3) !== 'id:')
    return null

  let id_hash = id.substring(3)

  if (id_hash in fb_async_resources && fb_valid(fb_async_resources[id_hash]))
    return fb_async_resources[id_hash]

  return null
}

// Draw the contents from a resource child to the resource parent
function fb_draw(
  resource_p,          // Framebuffer resource (parent)
  resource_c,          // Framebuffer resource (child)
  x = 0,               // Position X
  y = 0,               // Position Y
  w = -1,              // Width  (-1 = child's width)
  h = -1,              // Height (-1 = child's height)
  ox = 0,              // Offset to add to the X position of child
  oy = 0,              // Offset to add to the Y position of child
  transparent = false, // Handle tr, tg and tb colors as transparency
  tr = -1,             // Red channel to be used as transparency
  tg = -1,             // Green channel to be used as transparency
  tb = -1              // Blue channel to be used as transparency
) {
  resource_p = fb_resolve(resource_p)
  resource_c = fb_resolve(resource_c)

  w = clamp(w, -1, resource_c.width) | 0
  h = clamp(h, -1, resource_c.height) | 0

  // Don't draw
  if (w == 0 && h == 0)
    return

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

  return true
}

// Fill the area with the given color starting from x,y until all
// occurences of the background color have been replaced in that area.
function fb_fill(
  resource,               // Framebuffer resource
  x,                      // Position X
  y,                      // Position Y
  r,                      // Color channel Red
  g,                      // Color channel Green
  b,                      // Color channel Blue
  callback = fb_set_pixel // Callback function (defaults to fb_set_pixel)
) {
  let fill_stack = []
  fill_stack.push([x, y])

  let bg_color = fb_get_pixel(resource, x, y)

  if (callback === null)
    callback = fb_set_pixel

  // Let's not shoot ourselves in the foot
  if (bg_color[0] == r && bg_color[1] == g && bg_color[2] == b)
    return

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

  return true
}

// Retrieve a specific color channel from a resource
function fb_get_channel(
  resource,   // Framebuffer resource
  channel = 0 // Channel index (0=Red, 1=Green, 2=Blue) (default 0)
) {
  channel = clamp(channel, 0, 2)
  return fb_copy(resource, channel, channel, channel)
}

// Flip the image horizontally (X axis)
function fb_flip_x(
  resource // Framebuffer resource
) {
  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)
      let x2 = Math.abs(width - x) - 1
      fb_set_pixel(resource_new, x2, y, c[0], c[1], c[2])
    }
  }

  return resource_new
}

// Flip the image vertically (Y axis)
function fb_flip_y(
  resource // Framebuffer resource
) {
  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)
      let y2 = Math.abs(height - y) - 1
      fb_set_pixel(resource_new, x, y2, c[0], c[1], c[2])
    }
  }

  return resource_new
}

// Rotate image to the right
function fb_rotate_right(
  resource // Framebuffer resource
) {
  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(height, width)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)
      let y2 = Math.abs(height - y) - 1
      fb_set_pixel(resource_new, y2, x, c[0], c[1], c[2])
    }
  }

  return resource_new
}

// Rotate image to the left
function fb_rotate_left(
  resource // Framebuffer resource
) {
  let width = resource.width
  let height = resource.height
  let resource_new = fb_create(height, width)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)
      let x2 = Math.abs(width - x) - 1
      fb_set_pixel(resource_new, y, x2, c[0], c[1], c[2])
    }
  }

  return resource_new
}

// Replace a specific color in the image
function fb_replace_color(
  resource, // Framebuffer resource
  pr,       // Color channel Red   (parent)
  pg,       // Color channel Green (parent)
  pb,       // Color channel Blue  (parent)
  cr,       // Color channel Red   (child)
  cg,       // Color channel Green (child)
  cb        // Color channel Blue  (child)
) {
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

  return resource_new
}

// Invert colors of an image
function fb_color_invert(
  resource // Framebuffer resource
) {
  let width = resource.width
  let height = resource.height
  let resource_new = fb_copy(resource)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = fb_get_pixel(resource, x, y)

      c[0] = Math.abs(c[0] - 255)
      c[1] = Math.abs(c[1] - 255)
      c[2] = Math.abs(c[2] - 255)

      fb_set_pixel(resource_new, x, y, c[0], c[1], c[2])
    }
  }

  return resource_new
}

// Turn colors to grayscale in an image
function fb_color_grayscale(
  resource // Framebuffer resource
) {
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

  return resource_new
}

// Convert an image to appear like a 1-bit image
function fb_color_1bit(
  resource // Framebuffer resource
) {
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

  return resource_new
}

// Add grayscale noise to an image
function fb_noise_grayscale(
  resource,   // Framebuffer resource
  scale = 0.1 // Amount of noise to add ranging from 0.0 to 10.0
) {
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

  return resource_new
}

// Add RGB noise to an image
function fb_noise_rgb(
  resource,   // Framebuffer resource
  scale = 0.1 // Amount of noise to add ranging from 0.0 to 10.0
) {
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

  return resource_new
}

// Apply a convolution matrix to an image.
// More information about that here:
//  - https://en.wikipedia.org/wiki/Kernel_(image_processing)
//  - https://en.wikipedia.org/wiki/Convolution
//  - https://docs.gimp.org/2.8/en/plug-in-convmatrix.html
function fb_convolution_matrix(
  resource,                             // Framebuffer resource
  matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0], // Convolution matrix (3x3 and 5x5 only)
  divisor = 1,                          // How much to divide the average result
  offset = 0                            // Value to add to the quotient (division result)
) {
  if (matrix.length != 9 && matrix.length != 25)
    throw("Convolution matrix must be of size 3x3 (9) or 5x5 (25)")

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

        fb_set_pixel(
          resource_new,
          x, y,
          avg[0] + offset,
          avg[1] + offset,
          avg[2] + offset
        )
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

        fb_set_pixel(
          resource_new,
          x, y,
          avg[0] + offset,
          avg[1] + offset,
          avg[2] + offset
        )
      }
    }
  }

  return resource_new
}

// Sharpen an image
function fb_sharpen(
  resource // Framebuffer resource
) {
  let resource_new = fb_copy(resource)

  resource_new = fb_convolution_matrix(
    resource_new,
    [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ]
  )

  return resource_new
}

// Resize an image (using nearest neighbor)
function fb_resize(
  resource, // Framebuffer resource
  w,        // Width  (Rounded to nearest place)
  h         // Height (Rounded to nearest place)
) {
  w |= 0
  h |= 0

  // If the dimensions have not changed,
  // return the affectee resource
  if (w == resource.width && h == resource.height)
    return resource

  let resource_new = fb_create(w, h, resource.canvas)

  // Difference values between resource
  // and resource_new dimensions
  xd = resource.width  / w
  yd = resource.height / h

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let c = fb_get_pixel(
        resource,
        xd * x,
        yd * y
      )

      for (let i = 0; i < xd; i += xd) {
        for (let j = 0; j < yd; j += yd) {
          fb_set_pixel(
            resource_new,
            x + i,
            y + j,
            c[0],
            c[1],
            c[2],
            255
          )
        }
      }
    }
  }

  return resource_new
}

// Pixelate an image
function fb_pixelate(
  resource,  // Framebuffer resource
  factor = 2 // How much to divide image dimensions before upsampling (default 2, min 1)
) {
  // Factor min can be 1
  factor = clamp(factor, 1) | 0

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

  return resource_new
}

// Crop an image.
//
// In Mode 1, X1 and Y1 cannot be bigger than X2 and Y2 respectively.
// X1 and Y1 define Point #1 on the image which is the starting point
// and X2 and Y2 define Point #2 which is the ending point.
// All values between those 2 points will be the returned resource
// that contains the pixel data cropped within that area.
//
// If X1 or Y1 are equal to their neighboring counterparts, then the
// values of X2 or Y2 are increment by 1.
// If X1 is 42 and X2 is 42 then X2 will be 43 as we cannot return
// a cropped image if the 2 points fall on the same exact coordinate i.e.
// we cannot have an image whose sides are 0.
//
// Mode 2 overrides the resource_new width and height by treating
// X2 and Y2 as the dimensions and not the 2nd point on the image.
//
// If the width or height exceed the boundary of the affectee resource
// then the value that fb_get_pixel() returns by default when out of
// bounds will be written to the copy resource.
function fb_crop(
  resource, // Framebuffer resource
  x1   = 0, // Position X #1
  y1   = 0, // Position Y #1
  x2   = 1, // Position X #2 (Mode 2 uses it as width)
  y2   = 1, // Position Y #2 (Mode 2 uses it as height)
  mode = 0  // If 1, values [x2, y2] are used as width and height of the returned resource
) {
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

  let resource_new = fb_create(w, h, resource.canvas)
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

  return resource_new
}

// Detect edges in an image
function fb_detect_edge(
  resource, // Framebuffer resource
  mode = 0  // Available modes range from 0 to 2
) {
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

  return resource_new
}

// Box blur
function fb_blur_box(
  resource, // Framebuffer resource
  max = 1   // How many times to call the convolution matrix function (min 1)
) {
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

  return resource_new
}

// Gaussian blur
function fb_blur_gaussian(
  resource, // Framebuffer resource
  max = 1   // How many times to call the convolution matrix function (min 1)
) {
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

  return resource_new
}

// Emboss
function fb_emboss(
  resource, // Framebuffer resource
  power = 1 // How many times to apply the convolution matrix (min 0.01)
) {
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

  return resource_new
}

// Returns true if the resource has loaded
function fb_loaded(resource) {
  return fb_valid(resource) && resource.loaded
}

// Generate a unique resource id
function fb_gen_resource_id() {
  let chars = 'abcdef0123456789'
  let chars_len = chars.length
  let len = 24
  let buffer = ''

  while (--len)
    buffer += chars[(Math.random() * chars_len) | 0]

  return buffer
}

// Block modifications to the resource
function fb_lock(resource) {
  if (!fb_valid(resource))
    return false

  resource.locked = true
  return true
}

// Allow modifications to the resource
function fb_unlock(resource) {
  if (!fb_valid(resource))
    return false

  resource.locked = false
  return true
}

// Ensure the resource is loaded
function fb_loaded(resource) {
  resource = fb_resolve(resource)
  return fb_valid(resource) && resource.loaded
}

// Convert bytes to an array of numbers
function bin2pixels(bytes) {
  let numbers = []

  for (let byte of bytes) {
    numbers[numbers.length] = hexdec(bin2hex(byte))
  }

  return numbers
}

// Request raw bytes from URL using synchronous XMLHttpRequest
// Thanks to: https://tinyurl.com/SendingAndReceivingBinaryData
function http_get_bytes(
  url = null // URL pointing to a file
) {
  if (url == null)
    return false

  let xhr = new XMLHttpRequest()
  xhr.open('GET', url, false)
  xhr.overrideMimeType('text/plain; charset=x-user-defined')
  xhr.send()

  if (xhr.status != 200)
    return null

  // WARN: Had to come up  with a solution to remove preceeding 0x7F
  // bytes, which caused misalignment and overall incorrect response
  // of the data. This "hack" solves that issue, but I do  not  know
  // how stable it is. I've tried several files and it seems to just
  // "work." I hope it stays that way.
  data = xhr.response.split('')

  for (let i = 0, j = data.length; i < j; i++) {
    let value = bin2hex(data[i])

    if (value.length > 2) {
      value = value.substr(2, 2)
      data[i] = hex2bin(value)
    }
  }

  return data.join('')
}

// Converts Hexadecimal string back to binary string
function hex2bin(
  hex = null // Hexadecimal string
) {
  if (hex == null)
    return null

  hex = hex.toLowerCase()
  let hexl = hex.length

  if (hexl % 2)
    throw('Hexadecimal input string length must be even')

  let output = ''

  for (let i = 0; i < hexl; i += 2)
    output += String.fromCharCode(parseInt(hex.substr(i, 2), 16))

  return output
}

// Converts binary strings to Hexadecimal strings
function bin2hex(
  bin = null // Binary string
) {
  if (bin == null)
    return null

  let binl = bin.length
  let output = ''

  for (let i = 0; i < binl; i++) {
    let hex = bin.charCodeAt(i).toString(16)

    if (2 > hex.length)
      hex = '0' + hex

    output += hex
  }

  return output
}

// Convert a hexadecimal byte to an integer
function hexdec(
  v = null // Hexadecimal byte
) {
  if (v == null)
    return null

  return parseInt(v, 16)
}

// Convert an integer to a hexadecimal byte
function dechex(
  v = null // Integer
) {
  if (v == null)
    return null

  let h = Number(v).toString(16)

  if (h.length % 2)
    h = '0' + h

  return h
}

// Clamps a value between low and high
function clamp(v, l, h) {
  if (l > v) return l
  if (h < v) return h
             return v
}

// Returns a Unix timestamp
function time() {
  return Number(Date.now() / 1000) | 0
}

// Returns a Unix timestamp with miliseconds
function time_precise() {
  return Date.now()
}

// Returns true if N is in range of A and B
function in_range(n, a, b) {
  return (n >= a && n <= b)
}

// Linear interpolation
function lerp(a, b, t) {
  return a + (b - a) * t
}

// Degree to radian
function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

// Radian to degree
function rad2deg(rad) {
  return rad * (180 / Math.PI)
}

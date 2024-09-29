# Changelog

---

# 2024-09-29

## Added
- 155 color definitions (See FB_COLOR_ constants)

---

# 2024-09-22

## Added
- Added `is_ascii`: Determines if a string is ASCII (7-bit).
- Added `is_special`: Identifies characters that are neither numbers nor letters.
- Added `is_alpha`: Checks if a character is an alphabet letter.
- Added `is_digit`: Checks if a character is a number.

## Changed
- Changed JSDoc documentation to enhance clarity (ongoing).
- Changed comments to be more concise and focused.

## Fixed
- Fixed automatic semicolon insertion (ASI) issues by ensuring all lines end with a semicolon (`;`).

## Removed
- None. 

## Code Quality
- Conducted general refactoring to improve code readability and maintainability, including:
  - Renaming variables for improved clarity.
  - Restructuring function logic to align with best practices.

---

# 2024-09-14

- Added: function `fb_trim` - Trim empty space around the image
- Added: function `fb_log` - Console logging, with colors!
- Added: function `safe_div` - Safe division.
- Added: function `lerp` for compatibility - Linear interpolation
- Added: function `fb_getpos` for compatibility - Get X and Y position of a pixel in a 32-bit image
- Changed: function `fb_clear` 2nd parameter can be passed an integer representing RGB as in HEX (e.g. 0xFF0000 for red)
- Added: function `fb_rgb` - Convert various color representations to a color format understood by the library.
- Removed: function `fb_trunc_args` as it's not feasible until JavaScript implements pass-by-reference.

---

# 2024-09-12 (release 2)

- Changed: JSDoc major cleanup
- Fixed: Set canvas context attribute field `desynchronized` to `false` so that faulty Chrome browsers can render the image. This option is still toggleable through the `desync` configuration key via the `fb_config` function.
- 

---

# 2024-09-12 (release 1)

- Added `desync` configuration flag to control the Canvas 2D Context Attribute field `desynchronized` which may cause rendering issues on some versions of browsers.
- Changed configuration key `log_errors` to `error_log`
- Changed configuration key `use_resource_list` to `resource_list`

---

# 2024-09-11

- Added `FB_ERR_BAD_RESOURCE_STRUCTURE` for malformed resource objects.
- Added `FB_ERR_FROM_SYSTEM` for generic errors originating from 'system'.
- Added `origin` property to the `FBError` prototype, so we can differentiate from `System` and `User` errors with `FB_ORIGIN_` values.
- Added `function` property to the `FBError` prototype, so we get more insight into internal function calls and why the error was caused.
- Added `afterload` and `aftererror` callbacks to `fb_load` for cleaner code. See documentation for more information.
- Added function: `fb_update` - Update resource and reset dirty-bit.
- Added function: `fb_despawn` - Despawn resource from its container.
- Added function: `fb_hook_log_args` - Hook helper: Print function arguments.
- Added function: `rand` - Pseudo-random number generator.
- Added error definitions.
- Changed `fb_error` to be more robust and informative.
- Changed `fb_describe_error` so it works against multiple input types.
- Changed `fb_error_ids` to `fb_error_defs`.
- Changed `fb_draw` to use canvas built-in methods for updating pixels (no need for loops, faster).
- Fixed `fb_draw`, truncate all integers to prevent float precision error.
- Fixed error definition `FB_ERR_BAD_WIDTH` and `FB_ERR_BAD_HEIGHT` the same.
- Removed bi-directional lookup of error definitions - unnecessary complexity.
- Removed function: `fb_error_text` - Translate Error Text to ID.
- Removed function: `fb_error_id` in favor of `fb_describe_error`.
- Removed function: `fb_error_map_value` - Get error value either by ID or Text.
- Removed function: `fb_error_exists` - Check if error definition exists.

---

# 2024-09-05

- Added `error` field assignment in `fb_load` on error.
- Added `restore` argument to `fb_resize` for restoring the original size after downsampling.
- Added bi-directional map of error definitions at `fb_error_ids`.
- Added boundary checks in `fb_load`.
- Added configuration for the runtime of the library (see `fb_config_map`).
- Added constants `FB_VERSION_` denoting Year, Month, and Day of the library release.
- Added constants: `FB_DEFER_WRITE_THROUGH` and `FB_DEFER_WRITE_BACK` as defer types.
- Added function: `fb_clear_errors`.
- Added function: `fb_config_default`.
- Added function: `fb_config`.
- Added function: `fb_data_url`.
- Added function: `fb_defer`.
- Added function: `fb_describe_error`.
- Added function: `fb_draw_source`.
- Added function: `fb_error_exists`.
- Added function: `fb_error_id`.
- Added function: `fb_error_map_value`.
- Added function: `fb_error_text`.
- Added function: `fb_error`.
- Added function: `fb_get_last_error`.
- Added function: `fb_hook_active`.
- Added function: `fb_hook_call`.
- Added function: `fb_hook_disable`.
- Added function: `fb_hook_enable`.
- Added function: `fb_hook`.
- Added function: `fb_hooked`.
- Added function: `fb_list_functions`.
- Added function: `fb_resource_list_add`.
- Added function: `fb_resource_list_filter`.
- Added function: `fb_sync_config`.
- Added function: `fb_unhook`.
- Added function: `fb_version`.
- Added prototype: `FBError`.
- Added prototype: `FBErrorDefinition`.
- Added prototype: `FBResource`.
- Added support for hooking functions for debug and test.
- Changed `fb_sync` to allow variable arguments.
- Changed `fb_valid` to include prototype checks and more fields.
- Fixed `fb_line` rounding error causing empty gaps near connecting lines.
- Fixed dirty-bit assignment only used in `fb_set_pixel` and `fb_sync` (as needed).
- Fixed rounding error of coordinates in `fb_set_pixel`.
- Rename function `fb_replace_color` to `fb_color_replace`.
- Renamed constants `FB_IMAGEDATA_CHANNEL_X` to `FB_CHANNEL_X`.
- Renamed constants `FB_MAX_ALLOWED_(WIDTH|HEIGHT)` to `FB_MAX_(WIDTH|HEIGHT)`.
- Use linear data access in `fb_clear`.
- Use linear data access in `fb_color_invert`.
- Use linear data access in `fb_convolution_matrix`.

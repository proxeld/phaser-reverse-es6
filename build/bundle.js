(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.PhaserReverse = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"base64-js":1,"ieee754":4,"isarray":5}],3:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/
function clone(parent, circular, depth, prototype) {
  var filter;
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    filter = circular.filter;
    circular = circular.circular
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth == 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
};
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
};
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
};
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
};
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
};
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)

},{"buffer":2}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],6:[function(require,module,exports){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
    } else {
        root.log = definition();
    }
}(this, function () {
    "use strict";
    var noop = function() {};
    var undefinedType = "undefined";

    function realMethod(methodName) {
        if (typeof console === undefinedType) {
            return false; // We can't build a real method without a console to log to
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // these private functions always need `this` to be set properly

    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }
    }

    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";
      if (name) {
        storageKey += ":" + name;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      /*
       *
       * Public API
       *
       */

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Package-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if (typeof name !== "string" || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    return defaultLogger;
}));

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Multiplier = exports.Debugger = exports.Creators = exports.StateManipulator = exports.MementoCreator = undefined;

var _mementoCreator = require('./core/memento-creator.es6');

var _mementoCreator2 = _interopRequireDefault(_mementoCreator);

var _stateManipulator = require('./core/state-manipulator.es6');

var _stateManipulator2 = _interopRequireDefault(_stateManipulator);

var _creators = require('./core/creators.es6');

var _creators2 = _interopRequireDefault(_creators);

var _debugger = require('./utils/debugger.es6');

var _debugger2 = _interopRequireDefault(_debugger);

var _multiplier = require('./utils/multiplier.es6');

var _multiplier2 = _interopRequireDefault(_multiplier);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

console.info('%c⏳ PhaserReverse (v0.0.1) ⏳ Made with %c♥%c by proxeld', 'background: #222; color: #bada55', 'background: #222; color: #ff1111', 'background: #222; color: #bada55');

// Library API
/**
 The MIT License (MIT)

 Copyright (c) 2015 Maciej (proxeld) Urbanek

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */
/* eslint no-console: ["error", { allow: ["info"] }] */
exports.MementoCreator = _mementoCreator2.default;
exports.StateManipulator = _stateManipulator2.default;
exports.Creators = _creators2.default;
exports.Debugger = _debugger2.default;
exports.Multiplier = _multiplier2.default;

},{"./core/creators.es6":8,"./core/memento-creator.es6":9,"./core/state-manipulator.es6":10,"./utils/debugger.es6":12,"./utils/multiplier.es6":15}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _mementoCreator = require('./memento-creator.es6');

var _mementoCreator2 = _interopRequireDefault(_mementoCreator);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

var creators = {
    ANIMATION: new _mementoCreator2.default({
        custom: {
            frame: {
                create: function create(originator) {
                    return originator ? originator.frame : {};
                },
                restore: function restore(originator, memento) {
                    if (originator) {
                        originator.frame = originator._frames.indexOf(memento);
                    }
                }
            }
        }
    }),
    BODY_ARCADE: new _mementoCreator2.default({
        primitives: ['velocity.x', 'velocity.y', 'enable']
    }),
    BODY_P2JS: new _mementoCreator2.default({
        primitives: ['velocity.x', 'velocity.y', 'data.position.0', 'data.position.1', 'angularForce', 'angularVelocity', 'damping', 'x', 'y', 'rotation']
    }),
    BODY_NINJA: new _mementoCreator2.default({
        primitives: ['touching', 'wasTouching', 'velocity.x', 'velocity.y', 'x', 'y']
    }),
    TWEEN_MANAGER: new _mementoCreator2.default({
        arrays: {
            _tweens: undefined
        }
    }),
    TWEEN_DATA: new _mementoCreator2.default({
        primitives: ['dt', 'inReverse', 'isRunning', 'percent', 'value', 'repeatCounter', 'vStart', 'vEnd']
    }),
    TWEEN: new _mementoCreator2.default({
        primitives: ['pendingDelete', 'isRunning', 'isPaused', 'current'],
        custom: {
            tweenData: {
                create: function create(originator) {
                    return creators.TWEEN_DATA.create(originator.timeline[originator.current]);
                },
                restore: function restore(originator, memento) {
                    // in current version we rely on the fact that primitives are restored earlier than
                    // customs are. This will cause current property on the originator to be already restored.
                    // For now it's fine, but we should not relay on internal implementation of creating memento...
                    creators.TWEEN_DATA.restore(originator.timeline[originator.current], memento);
                    // memento.originator.timeline[memento.data.currentProp].restore(memento.data.tweenDataCustom);
                }
            }
        }
    }),
    CAMERA: new _mementoCreator2.default({
        primitives: ['view.x', 'view.y']
    }),
    WORLD: new _mementoCreator2.default({
        primitives: ['x', 'y']
    }),
    GROUP: new _mementoCreator2.default({
        primitives: ['x', 'y', 'exists', 'alive', 'alpha', 'angle']
    }),
    TEXT: new _mementoCreator2.default({
        primitives: ['text']
    })
}; /**
    The MIT License (MIT)
   
    Copyright (c) 2015 Maciej (proxeld) Urbanek
   
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
   
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
   
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
/* global Phaser */

creators.ANIMATION_MANAGER = new _mementoCreator2.default({
    refs: ['currentAnim'],
    nested: {
        currentAnim: creators.ANIMATION
    },
    aliases: {
        refs: {
            currentAnim: 'currentAnimRef'
        }
    }
});

creators.SPRITE = new _mementoCreator2.default({
    primitives: ['position.x', 'position.y', 'alive', 'exists', 'visible', 'scale.x', 'scale.y', 'angle'],
    nested: {
        animations: creators.ANIMATION_MANAGER
    },
    custom: {
        body: {
            create: function create(originator) {
                switch (originator.body.type) {
                    case Phaser.Physics.ARCADE:
                        return creators.BODY_ARCADE.create(originator.body);
                    case Phaser.Physics.P2JS:
                        return creators.BODY_P2JS.create(originator.body);
                    case Phaser.Physics.NINJA:
                        return creators.BODY_NINJA.create(originator.body);
                    default:
                        throw Error('Unknown body type: ' + originator.body.type);
                }
            },
            restore: function restore(originator, memento) {
                switch (originator.body.type) {
                    case Phaser.Physics.ARCADE:
                        creators.BODY_ARCADE.restore(originator.body, memento);
                        break;
                    case Phaser.Physics.P2JS:
                        creators.BODY_P2JS.restore(originator.body, memento);
                        break;
                    case Phaser.Physics.NINJA:
                        creators.BODY_NINJA.restore(originator.body, memento);
                        break;
                    default:
                        throw Error('Unknown body type: ' + originator.body.type);
                }
            }
        }
    }
});

creators.SPRITE_BARE = new _mementoCreator2.default({
    primitives: ['position.x', 'position.y', 'alive', 'exists', 'visible', 'scale.x', 'scale.y', 'angle']
});

exports.default = creators;

},{"./memento-creator.es6":9}],9:[function(require,module,exports){
'use strict';

var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol" ? function (obj) {
    return typeof obj === "undefined" ? "undefined" : _typeof2(obj);
} : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof2(obj);
};

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}(); /**
      The MIT License (MIT)
     
      Copyright (c) 2015 Maciej (proxeld) Urbanek
     
      Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal
      in the Software without restriction, including without limitation the rights
      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
      copies of the Software, and to permit persons to whom the Software is
      furnished to do so, subject to the following conditions:
     
      The above copyright notice and this permission notice shall be included in all
      copies or substantial portions of the Software.
     
      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
      SOFTWARE.
      */

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _utils = require('./utils.es6');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

/**
 * Remembered property is a common name for all primitives, refs, nested, custom and arrays
 * Primitives does not necessarily be primitive values (they will be copied regardless of the type)
 * Aliases are used for changing name of the property in the memento (to prevent name clashes)
 * @type {{primitives: Array, refs: Array, nested: {}, custom: {}, arrays: {}, aliases: {}}}
 */
var configDefault = {
    primitives: [],
    refs: [],
    nested: {},
    custom: {},
    arrays: {},
    aliases: {}
};

/**
 * Class for creating and restoring memento of different class of objects
 * @class
 */

var MementoCreator = function () {
    /**
     * Initializes MementoCreator
     * Config object should have following structure:
     * TODO: describe config structure
     * TODO: minification by using shorter keys for memento objects:
     * (http://stackoverflow.com/questions/9719676/javascript-object-sizes)
     * @param {object} config
     * @constructor
     */
    function MementoCreator(config) {
        _classCallCheck(this, MementoCreator);

        this.config = Object.assign({}, configDefault, config);
        MementoCreator._validateConfig(this.config);
    }

    /**
     * Primitive config validation to prevent most common errors asap
     * @param {object} config configuration object
     * @return {boolean} true if config is valid, false otherwise
     * @private
     */

    _createClass(MementoCreator, [{
        key: '_aliasify',

        /**
         * Check if alias for given property (in given type - @param conf) is available
         * This method is used to prevent clashes when the same propery has to be saved in memento in more than one way
         * (e.g. as reference and custom)
         * @param conf type of property (primitives/nested/refs/custom/arrays)
         * @param prop property to make alias for
         * @return {string} aliased property name or passed @prop if alias not found/specified
         * @private
         */
        value: function _aliasify(conf, prop) {
            if (this.config.aliases[conf] && this.config.aliases[conf][prop]) {
                return this.config.aliases[conf][prop];
            }

            return prop;
        }

        /**
         * Returns rough size of the memento in bytes
         * Used for debugging
         * @param memento memento object returned by {@link MementoCreator.create} method of this memento creator
         * @return {number} rough object size (in bytes)
         * @private
         * TODO: make it more accurate (handle different types of properties)
         */

    }, {
        key: '_calculateMementoSize',
        value: function _calculateMementoSize(memento) {
            var bytes = 0;

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this.config.primitives[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var prop = _step.value;

                    var alias = this._aliasify('primitives', prop);
                    bytes += _utils2.default.roughSizeOfObject(_utils2.default.getProperty(memento, alias));
                }

                // this is potentially dangerous
                // custom mementos has no defined structure
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = Object.keys(this.config.custom)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var key = _step2.value;

                    var _alias = this._aliasify('custom', key);
                    var value = _utils2.default.getProperty(memento, _alias);
                    bytes += _utils2.default.roughSizeOfObject(value);
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = Object.keys(this.config.nested)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var _prop = _step3.value;

                    var nestedCreator = this.config.nested[_prop];
                    var _alias2 = this._aliasify('nested', _prop);
                    var nestedData = _utils2.default.getProperty(memento, _alias2);
                    bytes += nestedCreator._calculateMementoSize(nestedData);
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            return bytes;
        }

        /**
         * Primitive remembered properties are stored as a copy of their original value (from originator)
         * Primitives should be primitive values or small objects with only a few properties
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator
         * @param vessel container on which remembered properties will be set
         * @private
         */

    }, {
        key: '_createPrimitivesMemento',
        value: function _createPrimitivesMemento(originator, vessel) {
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = this.config.primitives[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var prop = _step4.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('primitives', prop);

                    // clone property
                    // property cannot be circular object
                    var value = (0, _clone2.default)(_utils2.default.getProperty(originator, prop), false);

                    // save property copy on the vessel
                    _utils2.default.setProperty(vessel, alias, value);
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }
        }

        /**
         * Refs remembered properties are stored as a result of assignment
         * (objects are not copied, only another reference is created)
         * Note: This can prevent garbage collection of some objects
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator
         * @param vessel container on which remembered properties will be set
         * @private
         */

    }, {
        key: '_createRefsMemento',
        value: function _createRefsMemento(originator, vessel) {
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = this.config.refs[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var ref = _step5.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('refs', ref);

                    // create new reference to the value hold by originator
                    var value = _utils2.default.getProperty(originator, ref);

                    // save that reference on the vessel
                    _utils2.default.setProperty(vessel, alias, value);
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }
        }

        /**
         * Custom remembered properties are stored (and restored) using user-provided operation
         * It can be done in configuration process (while creating MementoCreator instance)
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator
         * @param vessel container on which remembered properties will be set
         * @private
         */

    }, {
        key: '_createCustomMemento',
        value: function _createCustomMemento(originator, vessel) {
            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
                for (var _iterator6 = Object.keys(this.config.custom)[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var key = _step6.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('custom', key);

                    // retrieve descriptor (object with create() and restore() methods) from configuartion
                    var descriptor = this.config.custom[key];

                    // create memento of the remembered property using provided descriptor
                    var value = descriptor.create(originator);

                    // save that property memento on the vessel
                    _utils2.default.setProperty(vessel, alias, value);
                }
            } catch (err) {
                _didIteratorError6 = true;
                _iteratorError6 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                        _iterator6.return();
                    }
                } finally {
                    if (_didIteratorError6) {
                        throw _iteratorError6;
                    }
                }
            }
        }

        /**
         * Nested remembered properties are stored (and restored) using user-provided MementoCreator
         * It can be done in configuration process (while creating MementoCreator instance)
         * It is especially useful when MementoCreator, for some property that is present in originator,
         * has already been created and can be reused
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator
         * @param vessel container on which remembered properties will be set
         * @private
         */

    }, {
        key: '_createNestedMemento',
        value: function _createNestedMemento(originator, vessel) {
            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = Object.keys(this.config.nested)[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var prop = _step7.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('nested', prop);

                    // retrieve MementoCreator for this specific prop from configuration
                    var nestedCreator = this.config.nested[prop];

                    // retrieve prop value
                    var nestedObj = _utils2.default.getProperty(originator, prop);

                    // use nested MementoCreator to create nested object memento
                    var memento = nestedCreator.create(nestedObj);

                    // save that object memento on the vessel
                    _utils2.default.setProperty(vessel, alias, memento);
                }
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                        _iterator7.return();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
                    }
                }
            }
        }

        /**
         * Arrays remembered properties are stored as follows:
         * - new array is created
         * - for each element of that array
         *   - if MementoCreator was specified (for element) then it's used to create element's memento
         *   - reference to the element as well as optional memento of that element is push to the array
         * - array from first step is set as a final memento of array remembered property (array from originator)
         * This should ensure restoring array's element even if it was removed from it in the future
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator
         * @param vessel container on which remembered properties will be set
         * @private
         */

    }, {
        key: '_createArraysMemento',
        value: function _createArraysMemento(originator, vessel) {
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
                for (var _iterator8 = Object.keys(this.config.arrays)[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                    var prop = _step8.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('arrays', prop);

                    // retrieve MementoCreator used for each element in array
                    var inArrayElemMementoCreator = this.config.arrays[prop];

                    // create new array - which will be memento of originator prop
                    // it is always a new array
                    var value = [];

                    // retrieve remembered property from originator
                    var memorable = _utils2.default.getProperty(originator, prop, []);

                    // iterate over every element of originator's remembered property - originator's array
                    var _iteratorNormalCompletion9 = true;
                    var _didIteratorError9 = false;
                    var _iteratorError9 = undefined;

                    try {
                        for (var _iterator9 = memorable[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                            var elem = _step9.value;

                            // if creator is specified, then create memento for each element of an array
                            if (inArrayElemMementoCreator) {
                                value.push({
                                    __ref: elem,
                                    memento: inArrayElemMementoCreator.create(elem)
                                });
                            } else {
                                value.push({
                                    __ref: elem
                                });
                            }
                        }

                        // save memento on the vessel
                    } catch (err) {
                        _didIteratorError9 = true;
                        _iteratorError9 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion9 && _iterator9.return) {
                                _iterator9.return();
                            }
                        } finally {
                            if (_didIteratorError9) {
                                throw _iteratorError9;
                            }
                        }
                    }

                    _utils2.default.setProperty(vessel, alias, value);
                }
            } catch (err) {
                _didIteratorError8 = true;
                _iteratorError8 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion8 && _iterator8.return) {
                        _iterator8.return();
                    }
                } finally {
                    if (_didIteratorError8) {
                        throw _iteratorError8;
                    }
                }
            }
        }

        /**
         * Creates memento of passed originator. To determine what properties should be remembered and how should they be
         * remembered configuration object is used that was passed to constructor of {@link MementoCreator.constructor}
         * @param originator
         * @see {@link MementoCreator.restore}
         * @return {object} memento of originator
         */

    }, {
        key: 'create',
        value: function create(originator) {
            // create object for storing mementos of all kinds of remembered properties
            var memento = {};

            this._createPrimitivesMemento(originator, memento);

            this._createRefsMemento(originator, memento);

            this._createCustomMemento(originator, memento);

            this._createNestedMemento(originator, memento);

            this._createArraysMemento(originator, memento);

            return memento;
        }

        /**
         * Primitives remembered properties from memento are copied and set on originator object
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator should be the same object that was passed to create method
         * @param memento should be memento returned by create method
         * @see {@link MementoCreator.create}
         * @private
         */

    }, {
        key: '_restorePrimitives',
        value: function _restorePrimitives(originator, memento) {
            var _iteratorNormalCompletion10 = true;
            var _didIteratorError10 = false;
            var _iteratorError10 = undefined;

            try {
                for (var _iterator10 = this.config.primitives[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                    var prop = _step10.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('primitives', prop);

                    // check if remembered property exists in memento
                    // the reason for this is that it could have been removed through the memento minification
                    if (_utils2.default.hasProperty(memento, alias)) {
                        // if so, extract remembered property from memento and copy it's value
                        var value = (0, _clone2.default)(_utils2.default.getProperty(memento, alias));

                        // set that copied value on originator object - use original name, not alias - aliases are only used internally
                        _utils2.default.setProperty(originator, prop, value);
                    }

                    // if remembered property does not exist in memento then simply skip it
                }
            } catch (err) {
                _didIteratorError10 = true;
                _iteratorError10 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion10 && _iterator10.return) {
                        _iterator10.return();
                    }
                } finally {
                    if (_didIteratorError10) {
                        throw _iteratorError10;
                    }
                }
            }
        }

        /**
         * For references the values from memento are simply assigned on originator object (not copied)
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator should be the same object that was passed to create method
         * @param memento should be memento returned by create method
         * @see {@link MementoCreator.create}
         * @private
         */

    }, {
        key: '_restoreRefs',
        value: function _restoreRefs(originator, memento) {
            var _iteratorNormalCompletion11 = true;
            var _didIteratorError11 = false;
            var _iteratorError11 = undefined;

            try {
                for (var _iterator11 = this.config.refs[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                    var ref = _step11.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('refs', ref);

                    // check if remembered property exists in memento
                    // the reason for this is that it could have been removed through the memento minification
                    if (_utils2.default.hasProperty(memento, alias)) {
                        // if so, extract remembered property from memento (not copied)
                        var value = _utils2.default.getProperty(memento, alias);

                        // set that value on originator object - use original name, not alias - aliases are only used internally
                        _utils2.default.setProperty(originator, ref, value);
                    }

                    // if remembered property does not exist in memento then simply skip it
                }
            } catch (err) {
                _didIteratorError11 = true;
                _iteratorError11 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion11 && _iterator11.return) {
                        _iterator11.return();
                    }
                } finally {
                    if (_didIteratorError11) {
                        throw _iteratorError11;
                    }
                }
            }
        }

        /**
         * For custom remembered properties use provided descriptor to restore memento
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator should be the same object that was passed to create method
         * @param memento should be memento returned by create method
         * @see {@link MementoCreator.create}
         * @private
         */

    }, {
        key: '_restoreCustom',
        value: function _restoreCustom(originator, memento) {
            var _iteratorNormalCompletion12 = true;
            var _didIteratorError12 = false;
            var _iteratorError12 = undefined;

            try {
                for (var _iterator12 = Object.keys(this.config.custom)[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
                    var key = _step12.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('custom', key);

                    // retrieve property descriptor (object with create() and restore() methods
                    var descriptor = this.config.custom[key];

                    // check if remembered property exists in memento
                    // the reason for this is that it could have been removed through the memento minification
                    if (_utils2.default.hasProperty(memento, alias)) {
                        // if so, extract remembered property from memento (not copied)
                        var value = _utils2.default.getProperty(memento, alias);

                        // restore state of nestedObj using descriptor
                        descriptor.restore(originator, value);
                    }

                    // if remembered property does not exist in memento then simply skip it
                }
            } catch (err) {
                _didIteratorError12 = true;
                _iteratorError12 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion12 && _iterator12.return) {
                        _iterator12.return();
                    }
                } finally {
                    if (_didIteratorError12) {
                        throw _iteratorError12;
                    }
                }
            }
        }

        /**
         * For nested remembered properties use another memento creator to restore memento
         * This is especially useful when object's property value is another type of object for which
         * we already have creator prepared (e.g. body on sprite)
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator should be the same object that was passed to create method
         * @param memento should be memento returned by create method
         * @see {@link MementoCreator.create}
         * @private
         */

    }, {
        key: '_restoreNested',
        value: function _restoreNested(originator, memento) {
            var _iteratorNormalCompletion13 = true;
            var _didIteratorError13 = false;
            var _iteratorError13 = undefined;

            try {
                for (var _iterator13 = Object.keys(this.config.nested)[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
                    var prop = _step13.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('nested', prop);

                    // retrieve nested memento creator from configuration
                    var nestedCreator = this.config.nested[prop];

                    // retrieve nested object for which nested creator will be used
                    var nestedObj = _utils2.default.getProperty(originator, prop);

                    // retrieve nested memento
                    var nestedMemento = _utils2.default.getProperty(memento, alias);

                    // restore state of nestedObj using nested memento creator and nested memento
                    nestedCreator.restore(nestedObj, nestedMemento);
                }
            } catch (err) {
                _didIteratorError13 = true;
                _iteratorError13 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion13 && _iterator13.return) {
                        _iterator13.return();
                    }
                } finally {
                    if (_didIteratorError13) {
                        throw _iteratorError13;
                    }
                }
            }
        }

        /**
         * For arrays remembered properties restore array elements adding all references from memento to newly created array
         * and optionally restoring their state using provided MementoCreator (per element)
         * Aliases are possible to prevent clashes with different kind of remembered properties
         * @param originator should be the same object that was passed to create method
         * @param memento should be memento returned by create method
         * @see {@link MementoCreator.create}
         * @private
         */

    }, {
        key: '_restoreArrays',
        value: function _restoreArrays(originator, memento) {
            // TODO: consider some optimization: right now every time memento is restored it needs to clear all array and then
            var _iteratorNormalCompletion14 = true;
            var _didIteratorError14 = false;
            var _iteratorError14 = undefined;

            try {
                for (var _iterator14 = Object.keys(this.config.arrays)[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
                    var prop = _step14.value;

                    // resolve final name of the remembered property used in the memento
                    var alias = this._aliasify('arrays', prop);

                    // retrieve MementoCreator used for each element in array
                    var inArrayElemMementoCreator = this.config.arrays[prop];

                    // check if remembered property exists in memento
                    // the reason for this is that it could have been removed through the memento minification
                    if (_utils2.default.hasProperty(memento, alias)) {
                        // retrieve current array from originator
                        var memorable = _utils2.default.getProperty(originator, prop, []);

                        // clear array (this will affect all references to the array)
                        memorable.length = 0;

                        // retrieve array memento
                        var arrayMemento = _utils2.default.getProperty(memento, alias);

                        // iterate over mementos of array elements
                        var _iteratorNormalCompletion15 = true;
                        var _didIteratorError15 = false;
                        var _iteratorError15 = undefined;

                        try {
                            for (var _iterator15 = arrayMemento[Symbol.iterator](), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
                                var arrayElemMemento = _step15.value;

                                // get reference to original element__ref
                                // this is necessary, because we need to have a way to know to which object from array apply it's memento
                                var elemRef = arrayElemMemento.__ref;

                                // if creator is specified, then restore memento for current element of an array
                                if (inArrayElemMementoCreator) {
                                    inArrayElemMementoCreator.restore(elemRef, arrayElemMemento.memento);
                                }

                                // push reference to original array
                                memorable.push(elemRef);
                            }

                            // set final result on the originator
                        } catch (err) {
                            _didIteratorError15 = true;
                            _iteratorError15 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion15 && _iterator15.return) {
                                    _iterator15.return();
                                }
                            } finally {
                                if (_didIteratorError15) {
                                    throw _iteratorError15;
                                }
                            }
                        }

                        _utils2.default.setProperty(originator, prop, memorable);
                    }

                    // if remembered property does not exist in memento then simply skip it
                }
            } catch (err) {
                _didIteratorError14 = true;
                _iteratorError14 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion14 && _iterator14.return) {
                        _iterator14.return();
                    }
                } finally {
                    if (_didIteratorError14) {
                        throw _iteratorError14;
                    }
                }
            }
        }

        /**
         * Restores memento created by {@link MementoCreator.create} method
         * @param originator should be the same object that was passed to create method
         * @param memento should be memento returned by create method
         * @see {@link MementoCreator.create}
         */

    }, {
        key: 'restore',
        value: function restore(originator, memento) {
            this._restorePrimitives(originator, memento);

            this._restoreRefs(originator, memento);

            this._restoreCustom(originator, memento);

            this._restoreNested(originator, memento);

            this._restoreArrays(originator, memento);
        }
    }], [{
        key: '_validateConfig',
        value: function _validateConfig(config) {
            var primitives = config.primitives,
                refs = config.refs,
                nested = config.nested,
                custom = config.custom,
                arrays = config.arrays;

            if (!Array.isArray(primitives)) {
                throw new Error('primitives should be an array');
            } else if (!Array.isArray(refs)) {
                throw new Error('refs should be an array');
            } else if (Array.isArray(nested) || (typeof nested === 'undefined' ? 'undefined' : _typeof(nested)) !== 'object') {
                throw new Error('nested should be an object');
            }

            // arrays validation
            if (Array.isArray(arrays) || (typeof custom === 'undefined' ? 'undefined' : _typeof(custom)) !== 'object') {
                throw new Error('"arrays" value (in config) should be an object');
            } else {
                var _iteratorNormalCompletion16 = true;
                var _didIteratorError16 = false;
                var _iteratorError16 = undefined;

                try {
                    for (var _iterator16 = Object.keys(arrays)[Symbol.iterator](), _step16; !(_iteratorNormalCompletion16 = (_step16 = _iterator16.next()).done); _iteratorNormalCompletion16 = true) {
                        var prop = _step16.value;

                        var creator = arrays[prop];
                        if (!(creator instanceof MementoCreator || creator === undefined)) {
                            throw new Error('arrays should have MementoCreator instance or undefined as a value for each property');
                        }
                    }
                } catch (err) {
                    _didIteratorError16 = true;
                    _iteratorError16 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion16 && _iterator16.return) {
                            _iterator16.return();
                        }
                    } finally {
                        if (_didIteratorError16) {
                            throw _iteratorError16;
                        }
                    }
                }
            }

            // custom validation
            if (Array.isArray(custom) || (typeof custom === 'undefined' ? 'undefined' : _typeof(custom)) !== 'object') {
                throw new Error('custom should be an object');
            } else {
                var _iteratorNormalCompletion17 = true;
                var _didIteratorError17 = false;
                var _iteratorError17 = undefined;

                try {
                    for (var _iterator17 = Object.keys(custom)[Symbol.iterator](), _step17; !(_iteratorNormalCompletion17 = (_step17 = _iterator17.next()).done); _iteratorNormalCompletion17 = true) {
                        var _prop2 = _step17.value;

                        var descriptor = custom[_prop2];
                        if (descriptor.create === undefined || descriptor.restore === undefined) {
                            throw new Error('custom should have create and restore methods for each custom property');
                        }
                    }
                } catch (err) {
                    _didIteratorError17 = true;
                    _iteratorError17 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion17 && _iterator17.return) {
                            _iterator17.return();
                        }
                    } finally {
                        if (_didIteratorError17) {
                            throw _iteratorError17;
                        }
                    }
                }
            }

            return true;
        }
    }]);

    return MementoCreator;
}();

exports.default = MementoCreator;

},{"./utils.es6":11,"clone":3}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () {
    function sliceIterator(arr, i) {
        var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
            for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
                _arr.push(_s.value);if (i && _arr.length === i) break;
            }
        } catch (err) {
            _d = true;_e = err;
        } finally {
            try {
                if (!_n && _i["return"]) _i["return"]();
            } finally {
                if (_d) throw _e;
            }
        }return _arr;
    }return function (arr, i) {
        if (Array.isArray(arr)) {
            return arr;
        } else if (Symbol.iterator in Object(arr)) {
            return sliceIterator(arr, i);
        } else {
            throw new TypeError("Invalid attempt to destructure non-iterable instance");
        }
    };
}();

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}(); /**
      The MIT License (MIT)
     
      Copyright (c) 2015 Maciej (proxeld) Urbanek
     
      Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal
      in the Software without restriction, including without limitation the rights
      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
      copies of the Software, and to permit persons to whom the Software is
      furnished to do so, subject to the following conditions:
     
      The above copyright notice and this permission notice shall be included in all
      copies or substantial portions of the Software.
     
      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
      SOFTWARE.
      */

var _mementoCreator = require('./memento-creator.es6');

var _mementoCreator2 = _interopRequireDefault(_mementoCreator);

var _logger = require('../utils/logger.es6');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var StateManipulator = function () {
    function StateManipulator() {
        _classCallCheck(this, StateManipulator);

        // Main data structure of state manipulator
        // Contains all recorded snapshots of the game state (consisting of mementos of various objects)
        // Single element has the following structure:
        // {
        //     timestamp: ...,          // timestamp of creating the mementos
        //     mementos: [
        //          {
        //              memorable: ..., // reference to memorable object that was used to create memento
        //              data: ...
        //          },
        //          ...
        //     ]     // mementos (array of mementos)
        // }
        this._snapshots = [];

        // Index of the current state. Most of the time it is equal to _snapshots array length
        // State stack can be traversed. This variable will be updated during traversal
        this._currentStateIndex = -1;

        // object => mementoCreator
        this._memorables = new Map();

        // class => mementoCreator
        this._creators = new Map();

        // cached value of memory footprint (size of all snapshots)
        // resetting value to 'undefined' will result in calculating memory footprint without considering cached value
        // this is used for optimization
        this._memoryFootprintCached = undefined;
    }

    /**
     * Begins new state pushing new object on the state stack and
     * remembering timestamp of state (a.k.a time of beginning of it's creation)
     * NOTE: This method is used internally. You should never use it by yourself.
     * @return {object} newly created state
     */

    _createClass(StateManipulator, [{
        key: '_initNewSnapshot',
        value: function _initNewSnapshot() {
            this._snapshots[++this._currentStateIndex] = {
                // TODO: check old method: timeManager.timeElapsed(),
                // TODO: check if game.time.time isn't more appropriate in here
                timestamp: new Date().getTime(),
                mementos: []
            };

            return this.getLastSnapshot();
        }

        /**
         * Clears snapshot stack (discards all remembered snapshots) and sets current index to proper value.
         * Resets cache
         */

    }, {
        key: 'discardAllSnapshots',
        value: function discardAllSnapshots() {
            this._snapshots = [];
            this._currentStateIndex = -1;
            this._memoryFootprintCached = undefined;
        }

        /**
         * Discard all taken snapshots that represent the future.
         * It means that we restored snapshot from the past and we do not want to
         * be able to store all snapshots taken after the snapshot we reverted to
         * Resets cache
         */

    }, {
        key: 'discardFutureSnapshots',
        value: function discardFutureSnapshots() {
            this._snapshots.splice(this._currentStateIndex + 1);
            this._memoryFootprintCached = undefined;
        }

        /**
         * By registering object it becomes subject of memento creation through #takeSnapshot() method
         * @param memorable any JavaScript object
         * @param creator creator which will create memento of memorable specified as first argument. This param is not
         * always mandatory. If undefined, StateManipulator will try to find creator which matches
         * memorable's construction function (class). This is done by caching creators for previously registered objects.
         * @throws Error if creator was not specified and cannot be found in cache
         * @see PhaserReverse.Creators for predefined creators for Phaser built-in objects
         * TODO: consider prevention of registration the same object multiple times
         */

    }, {
        key: 'registerMemorable',
        value: function registerMemorable(memorable, creator) {
            // check if creator was specified explicitly
            if (creator instanceof _mementoCreator2.default) {
                this._memorables.set(memorable, creator);

                // cache creator for latter usage with the same class of memorable object
                this._creators.set(memorable.constructor, creator);
            } else if (creator === undefined) {
                // if not, try to find creator associated with memorable class
                var found = false;

                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this._creators.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var _step$value = _slicedToArray(_step.value, 2),
                            _constructor = _step$value[0],
                            cachedCreator = _step$value[1];

                        // check cache of creators - search for creator that matches memorable class
                        if (memorable instanceof _constructor) {
                            this._memorables.set(memorable, cachedCreator);
                            found = true;
                            break;
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                if (!found) {
                    throw new Error('Creator not specified and not found in cache. Please specify a creator explicitly.');
                }
            } else {
                // not valid creator and not undefined
                throw new Error('Specified creator is not instance of MementoCreator class. Creator:', creator);
            }
        }

        /**
         * Creates mementos of the game (registered objects)
         * This method should be called in every frame after all update logic has been done
         * @return {object} snapshot of all memorables
         */

    }, {
        key: 'takeSnapshot',
        value: function takeSnapshot() {
            // initialize new snapshot
            var snapshot = this._initNewSnapshot();

            // TODO: save memento of tween manager - it is important for correct tween-reverse handling
            // state.mementos.push({
            //     originator: game.tweens,
            //     memento: game.tweens.createMemento()
            // });

            // create mementos for all memorables
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = this._memorables.entries()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var _step2$value = _slicedToArray(_step2.value, 2),
                        memorable = _step2$value[0],
                        creator = _step2$value[1];

                    snapshot.mementos.push({
                        memorable: memorable,
                        data: creator.create(memorable)
                    });
                }

                // add value of size of currently taken snapshot
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            this._memoryFootprintCached += this.roughSnapshotSize(snapshot);

            return snapshot;
        }

        /**
         * Restores state from snapshot taken by #takeSnapshot() method
         * @param snapshot snapshot created by #takeSnapshotMethod
         * @see takeSnapshot
         */

    }, {
        key: 'restoreSnapshot',
        value: function restoreSnapshot(snapshot) {
            // restore mementos of all memorables
            // NOTE: All the _memorables are still in the memory even if user of this library destroyed them in the game.
            //       This can lead to memory leaks.
            var snapshotNumber = this._snapshots.indexOf(snapshot);

            if (snapshotNumber === -1) {
                throw new Error('Snapshot not found in snapshots array. Is it a valid snapshot?');
            }

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = snapshot.mementos[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var memento = _step3.value;

                    var creator = this._memorables.get(memento.memorable);
                    creator.restore(memento.memorable, memento.data);
                }

                // reassign current state index
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            this._currentStateIndex = snapshotNumber;

            return snapshot;
        }

        /**
         * Changes current state on state situated n steps from current state
         * @param {number} step can be positive (going forward) or negative (going backward)
         */

    }, {
        key: 'shift',
        value: function shift() {
            var step = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;

            if (this._snapshots.length === 0) {
                _logger2.default.trace('No snapshots taken! State will not be change.');
                return undefined;
            }

            var previousStateIndex = this._currentStateIndex;
            var targetStateIndex = this._currentStateIndex;
            var targetSnapshot = void 0;
            var statesPath = void 0;

            if (step > 0) {
                targetStateIndex = Math.min(previousStateIndex + step, this._snapshots.length - 1);
                statesPath = this._snapshots.slice(previousStateIndex + 1, targetStateIndex + 1);
            } else if (step < 0) {
                targetStateIndex = Math.max(previousStateIndex + step, 0);
                statesPath = this._snapshots.slice(targetStateIndex, previousStateIndex).reverse();
            }

            // Time stopped. Three use-cases:
            // - step parameter is equal 0
            // - shifting forward and already at the end of snapshots
            // - shifting backward and already at the begging of snapshots
            if (targetStateIndex === previousStateIndex) {
                targetSnapshot = this.getCurrentSnapshot();
                this.restoreSnapshot(targetSnapshot);

                // TODO: recalibrate timer
                // timeManager.setTime(targetState.timestamp);
                // if (!timeStoppedDispatched) {
                //     timeManager.onTimeStopped.dispatch();
                //     if (currentStateIdx == stateStack.length - 1) {
                //         timeManager.onTimeStoppedMovingForward.dispatch();
                //     } else if (currentStateIdx == 0) {
                //         timeManager.onTimeStoppedMovingBackward.dispatch();
                //     }
                //
                // }
                // timeStoppedDispatched = true;

                // currentStateIndex didn't change - no need to update
                return targetSnapshot;
            }

            // timeStoppedDispatched = false;


            // restore all states sequentially
            // this is necessary if mementos are minified
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = statesPath[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var snapshot = _step4.value;

                    targetSnapshot = this.restoreSnapshot(snapshot);
                    // TODO: recalibrate timer
                    // timeManager.setTime(targetState.timestamp);
                }

                // update current state index
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            this._currentStateIndex = targetStateIndex;

            return targetSnapshot;
        }

        /**
         * Calculates rough size of memory usage by all snapshots
         * @param forceRecalculate force state manipulator to recalculate (prevent from using cached value)
         * @return {number}
         */

    }, {
        key: 'roughMemoryFootprint',
        value: function roughMemoryFootprint() {
            var forceRecalculate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            var size = this._memoryFootprintCached || 0;

            // refresh all calculations
            if (size === 0 || forceRecalculate) {
                var _iteratorNormalCompletion5 = true;
                var _didIteratorError5 = false;
                var _iteratorError5 = undefined;

                try {
                    for (var _iterator5 = this._snapshots[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                        var snapshot = _step5.value;

                        size += this.roughSnapshotSize(snapshot);
                    }

                    // cache for future
                } catch (err) {
                    _didIteratorError5 = true;
                    _iteratorError5 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion5 && _iterator5.return) {
                            _iterator5.return();
                        }
                    } finally {
                        if (_didIteratorError5) {
                            throw _iteratorError5;
                        }
                    }
                }

                this._memoryFootprintCached = size;
                _logger2.default.info('Recalculating memory footprint:', size);
            }

            return size;
        }

        /**
         * Calculates rough size of memory that is used by given snapshot
         * It is a sum of sizes of all mementos
         * @param snapshot
         * @return {number}
         */

    }, {
        key: 'roughSnapshotSize',
        value: function roughSnapshotSize(snapshot) {
            var size = 0;

            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
                for (var _iterator6 = snapshot.mementos[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var memento = _step6.value;

                    size += this.roughMementoSize(memento);
                }
            } catch (err) {
                _didIteratorError6 = true;
                _iteratorError6 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                        _iterator6.return();
                    }
                } finally {
                    if (_didIteratorError6) {
                        throw _iteratorError6;
                    }
                }
            }

            return size;
        }

        /**
         * Calculates rough size of memory that is used by memento
         * @param memento
         * @return {number}
         */

    }, {
        key: 'roughMementoSize',
        value: function roughMementoSize(memento) {
            if (this._memorables.has(memento.memorable)) {
                var creator = this._memorables.get(memento.memorable);
                return creator._calculateMementoSize(memento.data);
            }

            throw new Error('Memorable object from memento has no associated creator. Creator:', memento);
        }

        /**
         * Returns last state from the state stack. That is the last snapshot that was taken by takeSnapshot method
         * NOTE: last state is not always equal to current state. Last means last element of an array.
         * @return {object}
         */

    }, {
        key: 'getLastSnapshot',
        value: function getLastSnapshot() {
            if (this._snapshots.length < 1) {
                _logger2.default.trace('Stack of states is empty. Cannot return last state.');
                return undefined;
            }

            return this._snapshots[this._snapshots.length - 1];
        }

        /**
         * Returns snapshot that was either:
         * - most recently restored by some of the state manipulator methods (shift)
         * - or last taken snapshot by takeSnapshot method
         * Whichever was more recent
         * @returns {*}
         */

    }, {
        key: 'getCurrentSnapshot',
        value: function getCurrentSnapshot() {
            if (this._snapshots.length < 1) {
                _logger2.default.trace('Stack of states is empty. Cannot return last state.');
                return undefined;
            }

            return this._snapshots[this._currentStateIndex];
        }

        /**
         * Current state number getter,
         * @see getCurrentSnapshot for more information about what 'current' means
         * @returns {*}
         */

    }, {
        key: 'getCurrentSnapshotNumber',
        value: function getCurrentSnapshotNumber() {
            return this._currentStateIndex;
        }

        /**
         * Returns amount of currently stored snapshots
         * @return {Number} amount of currently stored snapshots
         */

    }, {
        key: 'getSnapshotsAmount',
        value: function getSnapshotsAmount() {
            return this._snapshots.length;
        }
    }]);

    return StateManipulator;
}();

exports.default = StateManipulator;

},{"../utils/logger.es6":14,"./memento-creator.es6":9}],11:[function(require,module,exports){
'use strict';

var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol" ? function (obj) {
    return typeof obj === "undefined" ? "undefined" : _typeof2(obj);
} : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof2(obj);
};

/**
 The MIT License (MIT)

 Copyright (c) 2015 Maciej (proxeld) Urbanek

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

exports.default = {
    /**
     * Returns object (possibly nested) property.
     * Takes into account prototype chain
     * @param obj object from which property is taken
     * @param dottedString simple property name or dotted name for nested properties
     * (e.g 'position.x' if you want to get x property from position property on @param obj)
     * @param fallbackValue if property is equal to undefined fallbackValue will be returned
     * (if not specified undefined will be returned)
     * @return {*}
     */
    getProperty: function getProperty(obj) {
        var dottedString = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var fallbackValue = arguments[2];

        var props = dottedString.split('.');
        var final = obj;

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = props[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var part = _step.value;

                if ((typeof final === 'undefined' ? 'undefined' : _typeof(final)) === 'object' && part in final) {
                    final = final[part];
                } else {
                    return fallbackValue;
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        return final;
    },

    /**
     * Sets property of an object (possibly nested).
     * If on the way to set final value properties are missing, they are being created
     * @param obj object on which property is set
     * @param dottedString simple property name or dotted name for nested properties
     * (e.g 'position.x' if you want to get x property from position property on @param obj)
     * @param value value of the property that is being set
     * @return {*}
     */
    setProperty: function setProperty(obj, dottedString, value) {
        if (dottedString === undefined) {
            return obj;
        }

        var props = dottedString.split('.');
        var lastProp = props.pop();
        var temp = obj;

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = props[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var part = _step2.value;

                if (temp.hasOwnProperty(part)) {
                    temp = temp[part];
                } else {
                    temp[part] = {};
                    temp = temp[part];
                }
            }
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }

        temp[lastProp] = value;

        return obj;
    },

    /**
     * Checks if property (possibly nested) exists in object
     * Takes into account prototype chain
     * @param obj object from which property is checked
     * @param dottedString simple property name or dotted name for nested properties
     * (e.g 'position.x' if you want to get x property from position property on @param obj)
     * @return {boolean}
     */
    hasProperty: function hasProperty(obj, dottedString) {
        var props = dottedString.split('.');
        var final = obj;

        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
            for (var _iterator3 = props[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var part = _step3.value;

                if ((typeof final === 'undefined' ? 'undefined' : _typeof(final)) === 'object' && part in final) {
                    final = final[part];
                } else {
                    return false;
                }
            }
        } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                    _iterator3.return();
                }
            } finally {
                if (_didIteratorError3) {
                    throw _iteratorError3;
                }
            }
        }

        return true;
    },

    // TODO: add doc to this function or replace it with better one
    // alternative: https://www.npmjs.com/package/object-sizeof
    roughSizeOfObject: function roughSizeOfObject(object) {
        // source: http://stackoverflow.com/questions/1248302/javascript-object-size#answer-11900218
        var objectList = [];
        var stack = [object];
        var bytes = 0;

        while (stack.length) {
            var value = stack.pop();

            if (typeof value === 'boolean') {
                bytes += 4;
            } else if (typeof value === 'string') {
                bytes += value.length * 2;
            } else if (typeof value === 'number') {
                bytes += 8;
            } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && objectList.indexOf(value) === -1 && value !== null) {
                objectList.push(value);

                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                    for (var _iterator4 = Object.keys(value)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                        var key = _step4.value;

                        // add length of the key
                        bytes += key.length * 2;

                        stack.push(value[key]);
                    }
                } catch (err) {
                    _didIteratorError4 = true;
                    _iteratorError4 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion4 && _iterator4.return) {
                            _iterator4.return();
                        }
                    } finally {
                        if (_didIteratorError4) {
                            throw _iteratorError4;
                        }
                    }
                }
            }
        }
        return bytes;
    }
};

},{}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}(); /**
      The MIT License (MIT)
     
      Copyright (c) 2015 Maciej (proxeld) Urbanek
     
      Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal
      in the Software without restriction, including without limitation the rights
      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
      copies of the Software, and to permit persons to whom the Software is
      furnished to do so, subject to the following conditions:
     
      The above copyright notice and this permission notice shall be included in all
      copies or substantial portions of the Software.
     
      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
      SOFTWARE.
      */

require('./debugger.less');

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var toolbarMarkup = "\n    <div id=\"state-slider-wrapper\">\n        <label for=\"state-slider\" id=\"slider-current-label\" class=\"label\" title=\"Current state\">1</label>\n        <label class=\"label\">/</label>\n        <label class=\"label\" id=\"slider-max-label\" title=\"States amount\">10</label>\n        <input type=\"range\" value=\"0\" min=\"1\" max=\"10\" step=\"1\" id=\"state-slider\"/>\n        <div class=\"btn\" id=\"manipulator-first\">&#8676;</div>\n        <div class=\"btn\" id=\"manipulator-previous\">\u276E</div>\n        <div class=\"btn\" id=\"manipulator-pause\">&#9654;</div>\n        <div class=\"btn\" id=\"manipulator-next\">\u276F</div>\n        <div class=\"btn\" id=\"manipulator-last\">&#8677;</div>\n    </div>\n";

var defaults = {
    toolbar: true
};

var Debugger = function () {
    function Debugger(game, stateManipulator, options) {
        _classCallCheck(this, Debugger);

        if (!game || !stateManipulator) {
            throw Error('Game or StateManipulator arguments are missing');
        }
        this.game = game;
        this.stateManipulator = stateManipulator;
        this.options = Object.assign({}, defaults, options);

        this._nodes = {
            toolbarDiv: null,
            slider: null,
            currentLabel: null,
            maxLabel: null,
            manipulatorFirst: null,
            manipulatorPrevious: null,
            manipulatorPause: null,
            manipulatorNext: null,
            manipulatorLast: null
        };

        // toolbar module
        if (this.options.toolbar) {
            this._createToolbar();
        }
    }

    /**
     * Construct all the markup associated with toolbar
     * @private
     */

    _createClass(Debugger, [{
        key: '_createToolbar',
        value: function _createToolbar() {
            this._nodes.toolbarDiv = document.createElement('div');
            this._nodes.toolbarDiv.id = 'debug-toolbar';
            this._nodes.toolbarDiv.innerHTML = toolbarMarkup;

            document.body.appendChild(this._nodes.toolbarDiv);

            this._bindNodes();

            // attach events
            this._attachEvents();

            // show toolbar
            this.show();
        }

        /**
         * Binds DOM elements with JS variables
         * @private
         */

    }, {
        key: '_bindNodes',
        value: function _bindNodes() {
            this._nodes.slider = document.getElementById('state-slider');
            this._nodes.maxLabel = document.getElementById('slider-max-label');
            this._nodes.currentLabel = document.getElementById('slider-current-label');
            this._nodes.manipulatorFirst = document.getElementById('manipulator-first');
            this._nodes.manipulatorPrevious = document.getElementById('manipulator-previous');
            this._nodes.manipulatorPause = document.getElementById('manipulator-pause');
            this._nodes.manipulatorNext = document.getElementById('manipulator-next');
            this._nodes.manipulatorLast = document.getElementById('manipulator-last');
        }
    }, {
        key: '_attachEvents',
        value: function _attachEvents() {
            var _this = this;

            var _nodes = this._nodes,
                slider = _nodes.slider,
                manipulatorPause = _nodes.manipulatorPause,
                manipulatorFirst = _nodes.manipulatorFirst,
                manipulatorPrevious = _nodes.manipulatorPrevious,
                manipulatorNext = _nodes.manipulatorNext,
                manipulatorLast = _nodes.manipulatorLast;

            // update label showing current state and pause game
            // and restore given snapshot

            slider.addEventListener('input', function () {
                _this.game.paused = true;
                _this._restoreWithLabelUpdate(slider.value - 1);
            });

            // pause/resume game and discard future states
            manipulatorPause.addEventListener('click', function () {
                _this.game.paused = !_this.game.paused;
                _this.stateManipulator.discardFutureSnapshots();
            });

            // pause game and restore first existing snapshot
            manipulatorFirst.addEventListener('click', function () {
                _this.game.paused = true;
                _this._restoreWithLabelUpdate(0);
            });

            // pause game and restore previous snapshot
            manipulatorPrevious.addEventListener('click', function () {
                // previous snapshot number
                var targetSnapshotNumber = Math.max(0, slider.value - 2);
                _this.game.paused = true;
                _this._restoreWithLabelUpdate(targetSnapshotNumber);
            });

            // pause game and restore next snapshot
            manipulatorNext.addEventListener('click', function () {
                // next snapshot number
                var targetSnapshotNumber = Math.min(_this.stateManipulator.getSnapshotsAmount() - 1, slider.value);
                _this.game.paused = true;
                _this._restoreWithLabelUpdate(targetSnapshotNumber);
            });

            // pause game and restore last existing snapshot
            manipulatorLast.addEventListener('click', function () {
                var targetSnapshotNumber = Math.min(_this.stateManipulator.getSnapshotsAmount() - 1);
                _this.game.paused = true;
                _this._restoreWithLabelUpdate(targetSnapshotNumber);
            });
        }

        /**
         * Convenient function for restoring certain snapshot and updating the slider labels
         *
         * @param number number of snapshot
         * @private
         */

    }, {
        key: '_restoreWithLabelUpdate',
        value: function _restoreWithLabelUpdate(number) {
            var _nodes2 = this._nodes,
                currentLabel = _nodes2.currentLabel,
                slider = _nodes2.slider;

            this.stateManipulator.restoreSnapshot(this.stateManipulator._snapshots[number]);

            // add one to handle 0-indexed array
            currentLabel.innerHTML = number + 1;
            slider.value = number + 1;
        }

        /**
         * Show toolbar on the screen
         * Use only if toolbar has been created during construction
         */

    }, {
        key: 'show',
        value: function show() {
            this._nodes.toolbarDiv.style.display = 'block';
        }

        /**
         * Hide toolbar
         * Use only if toolbar has been created during construction
         */

    }, {
        key: 'hide',
        value: function hide() {
            this._nodes.toolbarDiv.style.display = 'none';
        }

        /**
         * Updates labels/input values
         * Should be called in game's update function
         */

    }, {
        key: 'update',
        value: function update() {
            if (this.options.toolbar) {
                var snapshotsAmount = this.stateManipulator.getSnapshotsAmount();
                var currentSnapshot = this.stateManipulator.getCurrentSnapshotNumber();
                var _nodes3 = this._nodes,
                    slider = _nodes3.slider,
                    maxLabel = _nodes3.maxLabel,
                    currentLabel = _nodes3.currentLabel;

                currentLabel.innerHTML = currentSnapshot + 1;
                maxLabel.innerHTML = slider.max = slider.value = snapshotsAmount;
            }
        }

        /**
         * Draw debug information on the screen
         * @param stateManipulator
         * @param x
         * @param y
         * @param color
         */

    }, {
        key: 'stateManipulatorInfo',
        value: function stateManipulatorInfo(stateManipulator) {
            var x = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
            var y = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
            var color = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '#ffffff';

            if (!stateManipulator.getLastSnapshot()) {
                return;
            }

            var lastSnapshotSize = stateManipulator.roughSnapshotSize(stateManipulator.getLastSnapshot());
            var FRAME_RATE = 60;
            var MBPerSecond = lastSnapshotSize * FRAME_RATE / 1024 / 1024;
            var MBPerHour = MBPerSecond * 60 * 60;
            var memoryFootprint = stateManipulator.roughMemoryFootprint() / 1024 / 1024;

            this.game.debug.start(x, y, color);

            this.game.debug.line('Last snapshot size: ' + lastSnapshotSize + ' Bytes');
            this.game.debug.line('Memory footprint: ' + MBPerSecond.toFixed(4) + ' MB/s');
            this.game.debug.line('Memory footprint: ' + MBPerHour.toFixed(2) + ' MB/hour');
            this.game.debug.line('Memory footprint: ' + memoryFootprint.toFixed(2) + ' MB');

            this.game.debug.stop();
        }
    }]);

    return Debugger;
}();

exports.default = Debugger;

},{"./debugger.less":13}],13:[function(require,module,exports){
(function() { var head = document.getElementsByTagName('head')[0]; var style = document.createElement('style'); style.type = 'text/css';var css = "#debug-toolbar{position:absolute;top:0;left:0;width:100%;background:#EF5350;padding:8px 0}#debug-toolbar #state-slider-wrapper{display:flex;flex-direction:row}#debug-toolbar #state-slider-wrapper>*{margin:3px}#debug-toolbar #state-slider-wrapper .btn{display:inline-block;background:#FAFAFA;padding:3px 5px;box-shadow:1px 1px 3px 0 rgba(0,0,0,0.4);cursor:pointer;min-width:32px;text-align:center}#debug-toolbar #state-slider-wrapper .btn:hover{box-shadow:1px 1px 8px 0 rgba(0,0,0,0.8);background-color:#EEEEEE}#debug-toolbar #state-slider-wrapper .label{font-size:18px;font-weight:bold;color:#FAFAFA;width:2%;text-align:center}#debug-toolbar #state-slider-wrapper #state-slider{width:100%;cursor:pointer}";if (style.styleSheet){ style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); } head.appendChild(style);}())
},{}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _loglevel = require('loglevel');

var _loglevel2 = _interopRequireDefault(_loglevel);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

_loglevel2.default.setDefaultLevel(_loglevel2.default.levels.TRACE); /**
                                                                      The MIT License (MIT)
                                                                     
                                                                      Copyright (c) 2015 Maciej (proxeld) Urbanek
                                                                     
                                                                      Permission is hereby granted, free of charge, to any person obtaining a copy
                                                                      of this software and associated documentation files (the "Software"), to deal
                                                                      in the Software without restriction, including without limitation the rights
                                                                      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                                                                      copies of the Software, and to permit persons to whom the Software is
                                                                      furnished to do so, subject to the following conditions:
                                                                     
                                                                      The above copyright notice and this permission notice shall be included in all
                                                                      copies or substantial portions of the Software.
                                                                     
                                                                      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                                                                      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                                                                      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                                                                      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                                                                      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                                                                      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                                                                      SOFTWARE.
                                                                      */
exports.default = _loglevel2.default;

},{"loglevel":6}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

/**
 The MIT License (MIT)

 Copyright (c) 2015 Maciej (proxeld) Urbanek

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

var defaults = {
    range: [-8, -4, -2, -1, 0, 1, 2, 4, 8],
    resetIndex: 3
};

var Multiplier = function () {
    function Multiplier() {
        var range = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaults.range;
        var resetIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaults.resetIndex;

        _classCallCheck(this, Multiplier);

        this._range = range;
        this._resetIndex = Math.min(resetIndex, this._range.length - 1);
        this.reset();
    }

    _createClass(Multiplier, [{
        key: "reset",
        value: function reset() {
            this._currentMultiplierIndex = this._resetIndex;
            return this.current();
        }
    }, {
        key: "next",
        value: function next() {
            this._currentMultiplierIndex = Math.min(this._currentMultiplierIndex + 1, this._range.length - 1);
            return this.current();
        }
    }, {
        key: "previous",
        value: function previous() {
            this._currentMultiplierIndex = Math.max(this._currentMultiplierIndex - 1, 0);
            return this.current();
        }
    }, {
        key: "current",
        value: function current() {
            return this._range[this._currentMultiplierIndex];
        }
    }]);

    return Multiplier;
}();

exports.default = Multiplier;

},{}]},{},[7])(7)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jbG9uZS9jbG9uZS5qcyIsIm5vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9nbGV2ZWwvbGliL2xvZ2xldmVsLmpzIiwic3JjL2FwcC5lczYiLCJzcmMvY29yZS9jcmVhdG9ycy5lczYiLCJzcmMvY29yZS9tZW1lbnRvLWNyZWF0b3IuZXM2Iiwic3JjL2NvcmUvc3RhdGUtbWFuaXB1bGF0b3IuZXM2Iiwic3JjL2NvcmUvdXRpbHMuZXM2Iiwic3JjL3V0aWxzL2RlYnVnZ2VyLmVzNiIsInNyYy91dGlscy9kZWJ1Z2dlci5sZXNzIiwic3JjL3V0aWxzL2xvZ2dlci5lczYiLCJzcmMvdXRpbHMvbXVsdGlwbGllci5lczYiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7O0FDdk1BOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsUUFBQSxBQUFRLEtBQVIsQUFDSSwyREFESixBQUVJLG9DQUZKLEFBR0ksb0NBSEosQUFJSTs7QUFHSjtBQXJDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF1QkE7USxBQWdCSTtRLEFB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QUFLLE9BQUwsQUFBWSxTQUFwRCxBQUFtQixBQUEwQyxBQUM3RDthQUFBLEFBQUssQUFDUjs7Ozs7Z0NBRU8sQUFDSjtpQkFBQSxBQUFLLDBCQUEwQixLQUEvQixBQUFvQyxBQUNwQzttQkFBTyxLQUFQLEFBQU8sQUFBSyxBQUNmOzs7OytCQUVNLEFBQ0g7aUJBQUEsQUFBSywwQkFBMEIsS0FBQSxBQUFLLElBQUksS0FBQSxBQUFLLDBCQUFkLEFBQXdDLEdBQUcsS0FBQSxBQUFLLE9BQUwsQUFBWSxTQUF0RixBQUErQixBQUFnRSxBQUMvRjttQkFBTyxLQUFQLEFBQU8sQUFBSyxBQUNmOzs7O21DQUVVLEFBQ1A7aUJBQUEsQUFBSywwQkFBMEIsS0FBQSxBQUFLLElBQUksS0FBQSxBQUFLLDBCQUFkLEFBQXdDLEdBQXZFLEFBQStCLEFBQTJDLEFBQzFFO21CQUFPLEtBQVAsQUFBTyxBQUFLLEFBQ2Y7Ozs7a0NBRVMsQUFDTjttQkFBTyxLQUFBLEFBQUssT0FBTyxLQUFuQixBQUFPLEFBQWlCLEFBQzNCOzs7Ozs7O2tCLEFBekJnQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBwbGFjZUhvbGRlcnNDb3VudCAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICByZXR1cm4gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIHJldHVybiBiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG59XG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcbiAgcGxhY2VIb2xkZXJzID0gcGxhY2VIb2xkZXJzQ291bnQoYjY0KVxuXG4gIGFyciA9IG5ldyBBcnIobGVuICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICBsID0gcGxhY2VIb2xkZXJzID4gMCA/IGxlbiAtIDQgOiBsZW5cblxuICB2YXIgTCA9IDBcblxuICBmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8IHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBvdXRwdXQgPSAnJ1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aCkpKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPT0nXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArICh1aW50OFtsZW4gLSAxXSlcbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAxMF1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9J1xuICB9XG5cbiAgcGFydHMucHVzaChvdXRwdXQpXG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBEdWUgdG8gdmFyaW91cyBicm93c2VyIGJ1Z3MsIHNvbWV0aW1lcyB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uIHdpbGwgYmUgdXNlZCBldmVuXG4gKiB3aGVuIHRoZSBicm93c2VyIHN1cHBvcnRzIHR5cGVkIGFycmF5cy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqICAgLSBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsXG4gKiAgICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cblxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXlcbiAqIGdldCB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uLCB3aGljaCBpcyBzbG93ZXIgYnV0IGJlaGF2ZXMgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IGdsb2JhbC5UWVBFRF9BUlJBWV9TVVBQT1JUICE9PSB1bmRlZmluZWRcbiAgPyBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVFxuICA6IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuLypcbiAqIEV4cG9ydCBrTWF4TGVuZ3RoIGFmdGVyIHR5cGVkIGFycmF5IHN1cHBvcnQgaXMgZGV0ZXJtaW5lZC5cbiAqL1xuZXhwb3J0cy5rTWF4TGVuZ3RoID0ga01heExlbmd0aCgpXG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuX19wcm90b19fID0ge19fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfX1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBhcnIuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24ga01heExlbmd0aCAoKSB7XG4gIHJldHVybiBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVFxuICAgID8gMHg3ZmZmZmZmZlxuICAgIDogMHgzZmZmZmZmZlxufVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKHRoYXQsIGxlbmd0aCkge1xuICBpZiAoa01heExlbmd0aCgpIDwgbGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgdHlwZWQgYXJyYXkgbGVuZ3RoJylcbiAgfVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICBpZiAodGhhdCA9PT0gbnVsbCkge1xuICAgICAgdGhhdCA9IG5ldyBCdWZmZXIobGVuZ3RoKVxuICAgIH1cbiAgICB0aGF0Lmxlbmd0aCA9IGxlbmd0aFxuICB9XG5cbiAgcmV0dXJuIHRoYXRcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0lmIGVuY29kaW5nIGlzIHNwZWNpZmllZCB0aGVuIHRoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUodGhpcywgYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKHRoaXMsIGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuLy8gVE9ETzogTGVnYWN5LCBub3QgbmVlZGVkIGFueW1vcmUuIFJlbW92ZSBpbiBuZXh0IG1ham9yIHZlcnNpb24uXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gZnJvbSAodGhhdCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBhIG51bWJlcicpXG4gIH1cblxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiB2YWx1ZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih0aGF0LCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGF0LCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIHJldHVybiBmcm9tT2JqZWN0KHRoYXQsIHZhbHVlKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKG51bGwsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbmlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICBCdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG4gIEJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG4gIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAmJlxuICAgICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gICAgLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgICAgdmFsdWU6IG51bGwsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXInKVxuICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG5lZ2F0aXZlJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAodGhhdCwgc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2MobnVsbCwgc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlICh0aGF0LCBzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgKytpKSB7XG4gICAgICB0aGF0W2ldID0gMFxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKG51bGwsIHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKG51bGwsIHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJlbmNvZGluZ1wiIG11c3QgYmUgYSB2YWxpZCBzdHJpbmcgZW5jb2RpbmcnKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSB0aGF0LndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICB0aGF0ID0gdGhhdC5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyICh0aGF0LCBhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGFycmF5LmJ5dGVMZW5ndGggLy8gdGhpcyB0aHJvd3MgaWYgYGFycmF5YCBpcyBub3QgYSB2YWxpZCBBcnJheUJ1ZmZlclxuXG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdvZmZzZXRcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ2xlbmd0aFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYXJyYXkgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldClcbiAgfSBlbHNlIHtcbiAgICBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gYXJyYXlcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgdGhhdCA9IGZyb21BcnJheUxpa2UodGhhdCwgYXJyYXkpXG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAodGhhdCwgb2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuKVxuXG4gICAgaWYgKHRoYXQubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhhdFxuICAgIH1cblxuICAgIG9iai5jb3B5KHRoYXQsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gdGhhdFxuICB9XG5cbiAgaWYgKG9iaikge1xuICAgIGlmICgodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICBvYmouYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHx8ICdsZW5ndGgnIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBpc25hbihvYmoubGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHRoYXQsIDApXG4gICAgICB9XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmopXG4gICAgfVxuXG4gICAgaWYgKG9iai50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iai5kYXRhKSkge1xuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2UodGhhdCwgb2JqLmRhdGEpXG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignRmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksIG9yIGFycmF5LWxpa2Ugb2JqZWN0LicpXG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBrTWF4TGVuZ3RoKClgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnbGF0aW4xJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IHN0cmluZyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICAvLyBObyBuZWVkIHRvIHZlcmlmeSB0aGF0IFwidGhpcy5sZW5ndGggPD0gTUFYX1VJTlQzMlwiIHNpbmNlIGl0J3MgYSByZWFkLW9ubHlcbiAgLy8gcHJvcGVydHkgb2YgYSB0eXBlZCBhcnJheS5cblxuICAvLyBUaGlzIGJlaGF2ZXMgbmVpdGhlciBsaWtlIFN0cmluZyBub3IgVWludDhBcnJheSBpbiB0aGF0IHdlIHNldCBzdGFydC9lbmRcbiAgLy8gdG8gdGhlaXIgdXBwZXIvbG93ZXIgYm91bmRzIGlmIHRoZSB2YWx1ZSBwYXNzZWQgaXMgb3V0IG9mIHJhbmdlLlxuICAvLyB1bmRlZmluZWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYXMgcGVyIEVDTUEtMjYyIDZ0aCBFZGl0aW9uLFxuICAvLyBTZWN0aW9uIDEzLjMuMy43IFJ1bnRpbWUgU2VtYW50aWNzOiBLZXllZEJpbmRpbmdJbml0aWFsaXphdGlvbi5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgLy8gUmV0dXJuIGVhcmx5IGlmIHN0YXJ0ID4gdGhpcy5sZW5ndGguIERvbmUgaGVyZSB0byBwcmV2ZW50IHBvdGVudGlhbCB1aW50MzJcbiAgLy8gY29lcmNpb24gZmFpbCBiZWxvdy5cbiAgaWYgKHN0YXJ0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoZW5kIDw9IDApIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8vIEZvcmNlIGNvZXJzaW9uIHRvIHVpbnQzMi4gVGhpcyB3aWxsIGFsc28gY29lcmNlIGZhbHNleS9OYU4gdmFsdWVzIHRvIDAuXG4gIGVuZCA+Pj49IDBcbiAgc3RhcnQgPj4+PSAwXG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoZSBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIGFuZCBgaXMtYnVmZmVyYCAoaW4gU2FmYXJpIDUtNykgdG8gZGV0ZWN0XG4vLyBCdWZmZXIgaW5zdGFuY2VzLlxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwNjQgPSBmdW5jdGlvbiBzd2FwNjQgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDgpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyA3KVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyA2KVxuICAgIHN3YXAodGhpcywgaSArIDIsIGkgKyA1KVxuICAgIHN3YXAodGhpcywgaSArIDMsIGkgKyA0KVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8IDBcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuLy8gRmluZHMgZWl0aGVyIHRoZSBmaXJzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPj0gYGJ5dGVPZmZzZXRgLFxuLy8gT1IgdGhlIGxhc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0IDw9IGBieXRlT2Zmc2V0YC5cbi8vXG4vLyBBcmd1bWVudHM6XG4vLyAtIGJ1ZmZlciAtIGEgQnVmZmVyIHRvIHNlYXJjaFxuLy8gLSB2YWwgLSBhIHN0cmluZywgQnVmZmVyLCBvciBudW1iZXJcbi8vIC0gYnl0ZU9mZnNldCAtIGFuIGluZGV4IGludG8gYGJ1ZmZlcmA7IHdpbGwgYmUgY2xhbXBlZCB0byBhbiBpbnQzMlxuLy8gLSBlbmNvZGluZyAtIGFuIG9wdGlvbmFsIGVuY29kaW5nLCByZWxldmFudCBpcyB2YWwgaXMgYSBzdHJpbmdcbi8vIC0gZGlyIC0gdHJ1ZSBmb3IgaW5kZXhPZiwgZmFsc2UgZm9yIGxhc3RJbmRleE9mXG5mdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZiAoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgLy8gRW1wdHkgYnVmZmVyIG1lYW5zIG5vIG1hdGNoXG4gIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldFxuICBpZiAodHlwZW9mIGJ5dGVPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBieXRlT2Zmc2V0XG4gICAgYnl0ZU9mZnNldCA9IDBcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikge1xuICAgIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSB7XG4gICAgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIH1cbiAgYnl0ZU9mZnNldCA9ICtieXRlT2Zmc2V0ICAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAoaXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJlxuICAgICAgICB0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbIHZhbCBdLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgaVxuICBpZiAoZGlyKSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIGZvdW5kSW5kZXggKiBpbmRleFNpemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGJ5dGVPZmZzZXQgKyB2YWxMZW5ndGggPiBhcnJMZW5ndGgpIGJ5dGVPZmZzZXQgPSBhcnJMZW5ndGggLSB2YWxMZW5ndGhcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZvdW5kID0gdHJ1ZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWxMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAocmVhZChhcnIsIGkgKyBqKSAhPT0gcmVhZCh2YWwsIGopKSB7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIHRydWUpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUubGFzdEluZGV4T2YgPSBmdW5jdGlvbiBsYXN0SW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKGlzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2kgKyAxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47ICsraSkge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgKytpKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7ICsraSkge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBhc2NlbmRpbmcgY29weSBmcm9tIHN0YXJ0XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmIChjb2RlIDwgMjU2KSB7XG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiB1dGY4VG9CeXRlcyhuZXcgQnVmZmVyKHZhbCwgZW5jb2RpbmcpLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGlzbmFuICh2YWwpIHtcbiAgcmV0dXJuIHZhbCAhPT0gdmFsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCJ2YXIgY2xvbmUgPSAoZnVuY3Rpb24oKSB7XG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQ2xvbmVzIChjb3BpZXMpIGFuIE9iamVjdCB1c2luZyBkZWVwIGNvcHlpbmcuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBzdXBwb3J0cyBjaXJjdWxhciByZWZlcmVuY2VzIGJ5IGRlZmF1bHQsIGJ1dCBpZiB5b3UgYXJlIGNlcnRhaW5cbiAqIHRoZXJlIGFyZSBubyBjaXJjdWxhciByZWZlcmVuY2VzIGluIHlvdXIgb2JqZWN0LCB5b3UgY2FuIHNhdmUgc29tZSBDUFUgdGltZVxuICogYnkgY2FsbGluZyBjbG9uZShvYmosIGZhbHNlKS5cbiAqXG4gKiBDYXV0aW9uOiBpZiBgY2lyY3VsYXJgIGlzIGZhbHNlIGFuZCBgcGFyZW50YCBjb250YWlucyBjaXJjdWxhciByZWZlcmVuY2VzLFxuICogeW91ciBwcm9ncmFtIG1heSBlbnRlciBhbiBpbmZpbml0ZSBsb29wIGFuZCBjcmFzaC5cbiAqXG4gKiBAcGFyYW0gYHBhcmVudGAgLSB0aGUgb2JqZWN0IHRvIGJlIGNsb25lZFxuICogQHBhcmFtIGBjaXJjdWxhcmAgLSBzZXQgdG8gdHJ1ZSBpZiB0aGUgb2JqZWN0IHRvIGJlIGNsb25lZCBtYXkgY29udGFpblxuICogICAgY2lyY3VsYXIgcmVmZXJlbmNlcy4gKG9wdGlvbmFsIC0gdHJ1ZSBieSBkZWZhdWx0KVxuICogQHBhcmFtIGBkZXB0aGAgLSBzZXQgdG8gYSBudW1iZXIgaWYgdGhlIG9iamVjdCBpcyBvbmx5IHRvIGJlIGNsb25lZCB0b1xuICogICAgYSBwYXJ0aWN1bGFyIGRlcHRoLiAob3B0aW9uYWwgLSBkZWZhdWx0cyB0byBJbmZpbml0eSlcbiAqIEBwYXJhbSBgcHJvdG90eXBlYCAtIHNldHMgdGhlIHByb3RvdHlwZSB0byBiZSB1c2VkIHdoZW4gY2xvbmluZyBhbiBvYmplY3QuXG4gKiAgICAob3B0aW9uYWwgLSBkZWZhdWx0cyB0byBwYXJlbnQgcHJvdG90eXBlKS5cbiovXG5mdW5jdGlvbiBjbG9uZShwYXJlbnQsIGNpcmN1bGFyLCBkZXB0aCwgcHJvdG90eXBlKSB7XG4gIHZhciBmaWx0ZXI7XG4gIGlmICh0eXBlb2YgY2lyY3VsYXIgPT09ICdvYmplY3QnKSB7XG4gICAgZGVwdGggPSBjaXJjdWxhci5kZXB0aDtcbiAgICBwcm90b3R5cGUgPSBjaXJjdWxhci5wcm90b3R5cGU7XG4gICAgZmlsdGVyID0gY2lyY3VsYXIuZmlsdGVyO1xuICAgIGNpcmN1bGFyID0gY2lyY3VsYXIuY2lyY3VsYXJcbiAgfVxuICAvLyBtYWludGFpbiB0d28gYXJyYXlzIGZvciBjaXJjdWxhciByZWZlcmVuY2VzLCB3aGVyZSBjb3JyZXNwb25kaW5nIHBhcmVudHNcbiAgLy8gYW5kIGNoaWxkcmVuIGhhdmUgdGhlIHNhbWUgaW5kZXhcbiAgdmFyIGFsbFBhcmVudHMgPSBbXTtcbiAgdmFyIGFsbENoaWxkcmVuID0gW107XG5cbiAgdmFyIHVzZUJ1ZmZlciA9IHR5cGVvZiBCdWZmZXIgIT0gJ3VuZGVmaW5lZCc7XG5cbiAgaWYgKHR5cGVvZiBjaXJjdWxhciA9PSAndW5kZWZpbmVkJylcbiAgICBjaXJjdWxhciA9IHRydWU7XG5cbiAgaWYgKHR5cGVvZiBkZXB0aCA9PSAndW5kZWZpbmVkJylcbiAgICBkZXB0aCA9IEluZmluaXR5O1xuXG4gIC8vIHJlY3Vyc2UgdGhpcyBmdW5jdGlvbiBzbyB3ZSBkb24ndCByZXNldCBhbGxQYXJlbnRzIGFuZCBhbGxDaGlsZHJlblxuICBmdW5jdGlvbiBfY2xvbmUocGFyZW50LCBkZXB0aCkge1xuICAgIC8vIGNsb25pbmcgbnVsbCBhbHdheXMgcmV0dXJucyBudWxsXG4gICAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuXG4gICAgaWYgKGRlcHRoID09IDApXG4gICAgICByZXR1cm4gcGFyZW50O1xuXG4gICAgdmFyIGNoaWxkO1xuICAgIHZhciBwcm90bztcbiAgICBpZiAodHlwZW9mIHBhcmVudCAhPSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICB9XG5cbiAgICBpZiAoY2xvbmUuX19pc0FycmF5KHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gW107XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzUmVnRXhwKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IFJlZ0V4cChwYXJlbnQuc291cmNlLCBfX2dldFJlZ0V4cEZsYWdzKHBhcmVudCkpO1xuICAgICAgaWYgKHBhcmVudC5sYXN0SW5kZXgpIGNoaWxkLmxhc3RJbmRleCA9IHBhcmVudC5sYXN0SW5kZXg7XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzRGF0ZShwYXJlbnQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBEYXRlKHBhcmVudC5nZXRUaW1lKCkpO1xuICAgIH0gZWxzZSBpZiAodXNlQnVmZmVyICYmIEJ1ZmZlci5pc0J1ZmZlcihwYXJlbnQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBCdWZmZXIocGFyZW50Lmxlbmd0aCk7XG4gICAgICBwYXJlbnQuY29weShjaGlsZCk7XG4gICAgICByZXR1cm4gY2hpbGQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcHJvdG90eXBlID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIGNoaWxkID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY2hpbGQgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICAgIHByb3RvID0gcHJvdG90eXBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjaXJjdWxhcikge1xuICAgICAgdmFyIGluZGV4ID0gYWxsUGFyZW50cy5pbmRleE9mKHBhcmVudCk7XG5cbiAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICByZXR1cm4gYWxsQ2hpbGRyZW5baW5kZXhdO1xuICAgICAgfVxuICAgICAgYWxsUGFyZW50cy5wdXNoKHBhcmVudCk7XG4gICAgICBhbGxDaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIHBhcmVudCkge1xuICAgICAgdmFyIGF0dHJzO1xuICAgICAgaWYgKHByb3RvKSB7XG4gICAgICAgIGF0dHJzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgaSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhdHRycyAmJiBhdHRycy5zZXQgPT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNoaWxkW2ldID0gX2Nsb25lKHBhcmVudFtpXSwgZGVwdGggLSAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hpbGQ7XG4gIH1cblxuICByZXR1cm4gX2Nsb25lKHBhcmVudCwgZGVwdGgpO1xufVxuXG4vKipcbiAqIFNpbXBsZSBmbGF0IGNsb25lIHVzaW5nIHByb3RvdHlwZSwgYWNjZXB0cyBvbmx5IG9iamVjdHMsIHVzZWZ1bGwgZm9yIHByb3BlcnR5XG4gKiBvdmVycmlkZSBvbiBGTEFUIGNvbmZpZ3VyYXRpb24gb2JqZWN0IChubyBuZXN0ZWQgcHJvcHMpLlxuICpcbiAqIFVTRSBXSVRIIENBVVRJT04hIFRoaXMgbWF5IG5vdCBiZWhhdmUgYXMgeW91IHdpc2ggaWYgeW91IGRvIG5vdCBrbm93IGhvdyB0aGlzXG4gKiB3b3Jrcy5cbiAqL1xuY2xvbmUuY2xvbmVQcm90b3R5cGUgPSBmdW5jdGlvbiBjbG9uZVByb3RvdHlwZShwYXJlbnQpIHtcbiAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcblxuICB2YXIgYyA9IGZ1bmN0aW9uICgpIHt9O1xuICBjLnByb3RvdHlwZSA9IHBhcmVudDtcbiAgcmV0dXJuIG5ldyBjKCk7XG59O1xuXG4vLyBwcml2YXRlIHV0aWxpdHkgZnVuY3Rpb25zXG5cbmZ1bmN0aW9uIF9fb2JqVG9TdHIobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufTtcbmNsb25lLl9fb2JqVG9TdHIgPSBfX29ialRvU3RyO1xuXG5mdW5jdGlvbiBfX2lzRGF0ZShvKSB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgX19vYmpUb1N0cihvKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufTtcbmNsb25lLl9faXNEYXRlID0gX19pc0RhdGU7XG5cbmZ1bmN0aW9uIF9faXNBcnJheShvKSB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgX19vYmpUb1N0cihvKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5jbG9uZS5fX2lzQXJyYXkgPSBfX2lzQXJyYXk7XG5cbmZ1bmN0aW9uIF9faXNSZWdFeHAobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufTtcbmNsb25lLl9faXNSZWdFeHAgPSBfX2lzUmVnRXhwO1xuXG5mdW5jdGlvbiBfX2dldFJlZ0V4cEZsYWdzKHJlKSB7XG4gIHZhciBmbGFncyA9ICcnO1xuICBpZiAocmUuZ2xvYmFsKSBmbGFncyArPSAnZyc7XG4gIGlmIChyZS5pZ25vcmVDYXNlKSBmbGFncyArPSAnaSc7XG4gIGlmIChyZS5tdWx0aWxpbmUpIGZsYWdzICs9ICdtJztcbiAgcmV0dXJuIGZsYWdzO1xufTtcbmNsb25lLl9fZ2V0UmVnRXhwRmxhZ3MgPSBfX2dldFJlZ0V4cEZsYWdzO1xuXG5yZXR1cm4gY2xvbmU7XG59KSgpO1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBjbG9uZTtcbn1cbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwidmFyIHRvU3RyaW5nID0ge30udG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvKlxuKiBsb2dsZXZlbCAtIGh0dHBzOi8vZ2l0aHViLmNvbS9waW10ZXJyeS9sb2dsZXZlbFxuKlxuKiBDb3B5cmlnaHQgKGMpIDIwMTMgVGltIFBlcnJ5XG4qIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiovXG4oZnVuY3Rpb24gKHJvb3QsIGRlZmluaXRpb24pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShkZWZpbml0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QubG9nID0gZGVmaW5pdGlvbigpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcbiAgICB2YXIgdW5kZWZpbmVkVHlwZSA9IFwidW5kZWZpbmVkXCI7XG5cbiAgICBmdW5jdGlvbiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSB1bmRlZmluZWRUeXBlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFdlIGNhbid0IGJ1aWxkIGEgcmVhbCBtZXRob2Qgd2l0aG91dCBhIGNvbnNvbGUgdG8gbG9nIHRvXG4gICAgICAgIH0gZWxzZSBpZiAoY29uc29sZVttZXRob2ROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gYmluZE1ldGhvZChjb25zb2xlLCBtZXRob2ROYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlLmxvZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gYmluZE1ldGhvZChjb25zb2xlLCAnbG9nJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbm9vcDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJpbmRNZXRob2Qob2JqLCBtZXRob2ROYW1lKSB7XG4gICAgICAgIHZhciBtZXRob2QgPSBvYmpbbWV0aG9kTmFtZV07XG4gICAgICAgIGlmICh0eXBlb2YgbWV0aG9kLmJpbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBtZXRob2QuYmluZChvYmopO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuY2FsbChtZXRob2QsIG9iaik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gTWlzc2luZyBiaW5kIHNoaW0gb3IgSUU4ICsgTW9kZXJuaXpyLCBmYWxsYmFjayB0byB3cmFwcGluZ1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5hcHBseShtZXRob2QsIFtvYmosIGFyZ3VtZW50c10pO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB0aGVzZSBwcml2YXRlIGZ1bmN0aW9ucyBhbHdheXMgbmVlZCBgdGhpc2AgdG8gYmUgc2V0IHByb3Blcmx5XG5cbiAgICBmdW5jdGlvbiBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzKG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09IHVuZGVmaW5lZFR5cGUpIHtcbiAgICAgICAgICAgICAgICByZXBsYWNlTG9nZ2luZ01ldGhvZHMuY2FsbCh0aGlzLCBsZXZlbCwgbG9nZ2VyTmFtZSk7XG4gICAgICAgICAgICAgICAgdGhpc1ttZXRob2ROYW1lXS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcGxhY2VMb2dnaW5nTWV0aG9kcyhsZXZlbCwgbG9nZ2VyTmFtZSkge1xuICAgICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxvZ01ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtZXRob2ROYW1lID0gbG9nTWV0aG9kc1tpXTtcbiAgICAgICAgICAgIHRoaXNbbWV0aG9kTmFtZV0gPSAoaSA8IGxldmVsKSA/XG4gICAgICAgICAgICAgICAgbm9vcCA6XG4gICAgICAgICAgICAgICAgdGhpcy5tZXRob2RGYWN0b3J5KG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlZmF1bHRNZXRob2RGYWN0b3J5KG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKSB7XG4gICAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICAgIHJldHVybiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHx8XG4gICAgICAgICAgICAgICBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgdmFyIGxvZ01ldGhvZHMgPSBbXG4gICAgICAgIFwidHJhY2VcIixcbiAgICAgICAgXCJkZWJ1Z1wiLFxuICAgICAgICBcImluZm9cIixcbiAgICAgICAgXCJ3YXJuXCIsXG4gICAgICAgIFwiZXJyb3JcIlxuICAgIF07XG5cbiAgICBmdW5jdGlvbiBMb2dnZXIobmFtZSwgZGVmYXVsdExldmVsLCBmYWN0b3J5KSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY3VycmVudExldmVsO1xuICAgICAgdmFyIHN0b3JhZ2VLZXkgPSBcImxvZ2xldmVsXCI7XG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICBzdG9yYWdlS2V5ICs9IFwiOlwiICsgbmFtZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbE51bSkge1xuICAgICAgICAgIHZhciBsZXZlbE5hbWUgPSAobG9nTWV0aG9kc1tsZXZlbE51bV0gfHwgJ3NpbGVudCcpLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgICAvLyBVc2UgbG9jYWxTdG9yYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Vbc3RvcmFnZUtleV0gPSBsZXZlbE5hbWU7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG5cbiAgICAgICAgICAvLyBVc2Ugc2Vzc2lvbiBjb29raWUgYXMgZmFsbGJhY2tcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICB3aW5kb3cuZG9jdW1lbnQuY29va2llID1cbiAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RvcmFnZUtleSkgKyBcIj1cIiArIGxldmVsTmFtZSArIFwiO1wiO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZ2V0UGVyc2lzdGVkTGV2ZWwoKSB7XG4gICAgICAgICAgdmFyIHN0b3JlZExldmVsO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSB3aW5kb3cubG9jYWxTdG9yYWdlW3N0b3JhZ2VLZXldO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cblxuICAgICAgICAgIGlmICh0eXBlb2Ygc3RvcmVkTGV2ZWwgPT09IHVuZGVmaW5lZFR5cGUpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIHZhciBjb29raWUgPSB3aW5kb3cuZG9jdW1lbnQuY29va2llO1xuICAgICAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gY29va2llLmluZGV4T2YoXG4gICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9XCIpO1xuICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSAvXihbXjtdKykvLmV4ZWMoY29va2llLnNsaWNlKGxvY2F0aW9uKSlbMV07XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiB0aGUgc3RvcmVkIGxldmVsIGlzIG5vdCB2YWxpZCwgdHJlYXQgaXQgYXMgaWYgbm90aGluZyB3YXMgc3RvcmVkLlxuICAgICAgICAgIGlmIChzZWxmLmxldmVsc1tzdG9yZWRMZXZlbF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gc3RvcmVkTGV2ZWw7XG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICAgKlxuICAgICAgICogUHVibGljIEFQSVxuICAgICAgICpcbiAgICAgICAqL1xuXG4gICAgICBzZWxmLmxldmVscyA9IHsgXCJUUkFDRVwiOiAwLCBcIkRFQlVHXCI6IDEsIFwiSU5GT1wiOiAyLCBcIldBUk5cIjogMyxcbiAgICAgICAgICBcIkVSUk9SXCI6IDQsIFwiU0lMRU5UXCI6IDV9O1xuXG4gICAgICBzZWxmLm1ldGhvZEZhY3RvcnkgPSBmYWN0b3J5IHx8IGRlZmF1bHRNZXRob2RGYWN0b3J5O1xuXG4gICAgICBzZWxmLmdldExldmVsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBjdXJyZW50TGV2ZWw7XG4gICAgICB9O1xuXG4gICAgICBzZWxmLnNldExldmVsID0gZnVuY3Rpb24gKGxldmVsLCBwZXJzaXN0KSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJzdHJpbmdcIiAmJiBzZWxmLmxldmVsc1tsZXZlbC50b1VwcGVyQ2FzZSgpXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGxldmVsID0gc2VsZi5sZXZlbHNbbGV2ZWwudG9VcHBlckNhc2UoKV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09IFwibnVtYmVyXCIgJiYgbGV2ZWwgPj0gMCAmJiBsZXZlbCA8PSBzZWxmLmxldmVscy5TSUxFTlQpIHtcbiAgICAgICAgICAgICAgY3VycmVudExldmVsID0gbGV2ZWw7XG4gICAgICAgICAgICAgIGlmIChwZXJzaXN0ICE9PSBmYWxzZSkgeyAgLy8gZGVmYXVsdHMgdG8gdHJ1ZVxuICAgICAgICAgICAgICAgICAgcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzLmNhbGwoc2VsZiwgbGV2ZWwsIG5hbWUpO1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUgJiYgbGV2ZWwgPCBzZWxmLmxldmVscy5TSUxFTlQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBcIk5vIGNvbnNvbGUgYXZhaWxhYmxlIGZvciBsb2dnaW5nXCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBcImxvZy5zZXRMZXZlbCgpIGNhbGxlZCB3aXRoIGludmFsaWQgbGV2ZWw6IFwiICsgbGV2ZWw7XG4gICAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2VsZi5zZXREZWZhdWx0TGV2ZWwgPSBmdW5jdGlvbiAobGV2ZWwpIHtcbiAgICAgICAgICBpZiAoIWdldFBlcnNpc3RlZExldmVsKCkpIHtcbiAgICAgICAgICAgICAgc2VsZi5zZXRMZXZlbChsZXZlbCwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHNlbGYuZW5hYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuVFJBQ0UsIHBlcnNpc3QpO1xuICAgICAgfTtcblxuICAgICAgc2VsZi5kaXNhYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuU0lMRU5ULCBwZXJzaXN0KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIEluaXRpYWxpemUgd2l0aCB0aGUgcmlnaHQgbGV2ZWxcbiAgICAgIHZhciBpbml0aWFsTGV2ZWwgPSBnZXRQZXJzaXN0ZWRMZXZlbCgpO1xuICAgICAgaWYgKGluaXRpYWxMZXZlbCA9PSBudWxsKSB7XG4gICAgICAgICAgaW5pdGlhbExldmVsID0gZGVmYXVsdExldmVsID09IG51bGwgPyBcIldBUk5cIiA6IGRlZmF1bHRMZXZlbDtcbiAgICAgIH1cbiAgICAgIHNlbGYuc2V0TGV2ZWwoaW5pdGlhbExldmVsLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKlxuICAgICAqIFBhY2thZ2UtbGV2ZWwgQVBJXG4gICAgICpcbiAgICAgKi9cblxuICAgIHZhciBkZWZhdWx0TG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuXG4gICAgdmFyIF9sb2dnZXJzQnlOYW1lID0ge307XG4gICAgZGVmYXVsdExvZ2dlci5nZXRMb2dnZXIgPSBmdW5jdGlvbiBnZXRMb2dnZXIobmFtZSkge1xuICAgICAgICBpZiAodHlwZW9mIG5hbWUgIT09IFwic3RyaW5nXCIgfHwgbmFtZSA9PT0gXCJcIikge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBzdXBwbHkgYSBuYW1lIHdoZW4gY3JlYXRpbmcgYSBsb2dnZXIuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvZ2dlciA9IF9sb2dnZXJzQnlOYW1lW25hbWVdO1xuICAgICAgICBpZiAoIWxvZ2dlcikge1xuICAgICAgICAgIGxvZ2dlciA9IF9sb2dnZXJzQnlOYW1lW25hbWVdID0gbmV3IExvZ2dlcihcbiAgICAgICAgICAgIG5hbWUsIGRlZmF1bHRMb2dnZXIuZ2V0TGV2ZWwoKSwgZGVmYXVsdExvZ2dlci5tZXRob2RGYWN0b3J5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9nZ2VyO1xuICAgIH07XG5cbiAgICAvLyBHcmFiIHRoZSBjdXJyZW50IGdsb2JhbCBsb2cgdmFyaWFibGUgaW4gY2FzZSBvZiBvdmVyd3JpdGVcbiAgICB2YXIgX2xvZyA9ICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlKSA/IHdpbmRvdy5sb2cgOiB1bmRlZmluZWQ7XG4gICAgZGVmYXVsdExvZ2dlci5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlICYmXG4gICAgICAgICAgICAgICB3aW5kb3cubG9nID09PSBkZWZhdWx0TG9nZ2VyKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9nID0gX2xvZztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWZhdWx0TG9nZ2VyO1xuICAgIH07XG5cbiAgICByZXR1cm4gZGVmYXVsdExvZ2dlcjtcbn0pKTtcbiIsIi8qKlxuIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gQ29weXJpZ2h0IChjKSAyMDE1IE1hY2llaiAocHJveGVsZCkgVXJiYW5la1xuXG4gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG4gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gU09GVFdBUkUuXG4gKi9cbi8qIGVzbGludCBuby1jb25zb2xlOiBbXCJlcnJvclwiLCB7IGFsbG93OiBbXCJpbmZvXCJdIH1dICovXG5pbXBvcnQgTWVtZW50b0NyZWF0b3IgZnJvbSAnLi9jb3JlL21lbWVudG8tY3JlYXRvci5lczYnO1xuaW1wb3J0IFN0YXRlTWFuaXB1bGF0b3IgZnJvbSAnLi9jb3JlL3N0YXRlLW1hbmlwdWxhdG9yLmVzNic7XG5pbXBvcnQgQ3JlYXRvcnMgZnJvbSAnLi9jb3JlL2NyZWF0b3JzLmVzNic7XG5pbXBvcnQgRGVidWdnZXIgZnJvbSAnLi91dGlscy9kZWJ1Z2dlci5lczYnO1xuaW1wb3J0IE11bHRpcGxpZXIgZnJvbSAnLi91dGlscy9tdWx0aXBsaWVyLmVzNic7XG5cbmNvbnNvbGUuaW5mbyhcbiAgICAnJWPij7MgUGhhc2VyUmV2ZXJzZSAodjAuMC4xKSDij7MgTWFkZSB3aXRoICVj4pmlJWMgYnkgcHJveGVsZCcsXG4gICAgJ2JhY2tncm91bmQ6ICMyMjI7IGNvbG9yOiAjYmFkYTU1JyxcbiAgICAnYmFja2dyb3VuZDogIzIyMjsgY29sb3I6ICNmZjExMTEnLFxuICAgICdiYWNrZ3JvdW5kOiAjMjIyOyBjb2xvcjogI2JhZGE1NSdcbik7XG5cbi8vIExpYnJhcnkgQVBJXG5leHBvcnQge1xuICAgIE1lbWVudG9DcmVhdG9yLFxuICAgIFN0YXRlTWFuaXB1bGF0b3IsXG4gICAgQ3JlYXRvcnMsXG4gICAgRGVidWdnZXIsXG4gICAgTXVsdGlwbGllcixcbn07XG4iLCIvKipcbiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuIENvcHlyaWdodCAoYykgMjAxNSBNYWNpZWogKHByb3hlbGQpIFVyYmFuZWtcblxuIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuIFNPRlRXQVJFLlxuICovXG4vKiBnbG9iYWwgUGhhc2VyICovXG5pbXBvcnQgTWVtZW50b0NyZWF0b3IgZnJvbSAnLi9tZW1lbnRvLWNyZWF0b3IuZXM2JztcblxuY29uc3QgY3JlYXRvcnMgPSB7XG4gICAgQU5JTUFUSU9OOiBuZXcgTWVtZW50b0NyZWF0b3Ioe1xuICAgICAgICBjdXN0b206IHtcbiAgICAgICAgICAgIGZyYW1lOiB7XG4gICAgICAgICAgICAgICAgY3JlYXRlOiBvcmlnaW5hdG9yID0+IChvcmlnaW5hdG9yID8gb3JpZ2luYXRvci5mcmFtZSA6IHt9KSxcbiAgICAgICAgICAgICAgICByZXN0b3JlOiAob3JpZ2luYXRvciwgbWVtZW50bykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3JpZ2luYXRvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYXRvci5mcmFtZSA9IG9yaWdpbmF0b3IuX2ZyYW1lcy5pbmRleE9mKG1lbWVudG8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgfSksXG4gICAgQk9EWV9BUkNBREU6IG5ldyBNZW1lbnRvQ3JlYXRvcih7XG4gICAgICAgIHByaW1pdGl2ZXM6IFsndmVsb2NpdHkueCcsICd2ZWxvY2l0eS55JywgJ2VuYWJsZSddLFxuICAgIH0pLFxuICAgIEJPRFlfUDJKUzogbmV3IE1lbWVudG9DcmVhdG9yKHtcbiAgICAgICAgcHJpbWl0aXZlczogWyd2ZWxvY2l0eS54JywgJ3ZlbG9jaXR5LnknLCAnZGF0YS5wb3NpdGlvbi4wJywgJ2RhdGEucG9zaXRpb24uMScsICdhbmd1bGFyRm9yY2UnLFxuICAgICAgICAgICAgJ2FuZ3VsYXJWZWxvY2l0eScsICdkYW1waW5nJywgJ3gnLCAneScsICdyb3RhdGlvbiddLFxuICAgIH0pLFxuICAgIEJPRFlfTklOSkE6IG5ldyBNZW1lbnRvQ3JlYXRvcih7XG4gICAgICAgIHByaW1pdGl2ZXM6IFsndG91Y2hpbmcnLCAnd2FzVG91Y2hpbmcnLCAndmVsb2NpdHkueCcsICd2ZWxvY2l0eS55JywgJ3gnLCAneSddLFxuICAgIH0pLFxuICAgIFRXRUVOX01BTkFHRVI6IG5ldyBNZW1lbnRvQ3JlYXRvcih7XG4gICAgICAgIGFycmF5czoge1xuICAgICAgICAgICAgX3R3ZWVuczogdW5kZWZpbmVkLFxuICAgICAgICB9LFxuICAgIH0pLFxuICAgIFRXRUVOX0RBVEE6IG5ldyBNZW1lbnRvQ3JlYXRvcih7XG4gICAgICAgIHByaW1pdGl2ZXM6IFsnZHQnLCAnaW5SZXZlcnNlJywgJ2lzUnVubmluZycsICdwZXJjZW50JywgJ3ZhbHVlJywgJ3JlcGVhdENvdW50ZXInLCAndlN0YXJ0JywgJ3ZFbmQnXSxcbiAgICB9KSxcbiAgICBUV0VFTjogbmV3IE1lbWVudG9DcmVhdG9yKHtcbiAgICAgICAgcHJpbWl0aXZlczogWydwZW5kaW5nRGVsZXRlJywgJ2lzUnVubmluZycsICdpc1BhdXNlZCcsICdjdXJyZW50J10sXG4gICAgICAgIGN1c3RvbToge1xuICAgICAgICAgICAgdHdlZW5EYXRhOiB7XG4gICAgICAgICAgICAgICAgY3JlYXRlOiBvcmlnaW5hdG9yID0+IGNyZWF0b3JzLlRXRUVOX0RBVEEuY3JlYXRlKG9yaWdpbmF0b3IudGltZWxpbmVbb3JpZ2luYXRvci5jdXJyZW50XSksXG4gICAgICAgICAgICAgICAgcmVzdG9yZTogKG9yaWdpbmF0b3IsIG1lbWVudG8pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaW4gY3VycmVudCB2ZXJzaW9uIHdlIHJlbHkgb24gdGhlIGZhY3QgdGhhdCBwcmltaXRpdmVzIGFyZSByZXN0b3JlZCBlYXJsaWVyIHRoYW5cbiAgICAgICAgICAgICAgICAgICAgLy8gY3VzdG9tcyBhcmUuIFRoaXMgd2lsbCBjYXVzZSBjdXJyZW50IHByb3BlcnR5IG9uIHRoZSBvcmlnaW5hdG9yIHRvIGJlIGFscmVhZHkgcmVzdG9yZWQuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBub3cgaXQncyBmaW5lLCBidXQgd2Ugc2hvdWxkIG5vdCByZWxheSBvbiBpbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiBvZiBjcmVhdGluZyBtZW1lbnRvLi4uXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0b3JzLlRXRUVOX0RBVEEucmVzdG9yZShvcmlnaW5hdG9yLnRpbWVsaW5lW29yaWdpbmF0b3IuY3VycmVudF0sIG1lbWVudG8pO1xuICAgICAgICAgICAgICAgICAgICAvLyBtZW1lbnRvLm9yaWdpbmF0b3IudGltZWxpbmVbbWVtZW50by5kYXRhLmN1cnJlbnRQcm9wXS5yZXN0b3JlKG1lbWVudG8uZGF0YS50d2VlbkRhdGFDdXN0b20pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH0pLFxuICAgIENBTUVSQTogbmV3IE1lbWVudG9DcmVhdG9yKHtcbiAgICAgICAgcHJpbWl0aXZlczogWyd2aWV3LngnLCAndmlldy55J10sXG4gICAgfSksXG4gICAgV09STEQ6IG5ldyBNZW1lbnRvQ3JlYXRvcih7XG4gICAgICAgIHByaW1pdGl2ZXM6IFsneCcsICd5J10sXG4gICAgfSksXG4gICAgR1JPVVA6IG5ldyBNZW1lbnRvQ3JlYXRvcih7XG4gICAgICAgIHByaW1pdGl2ZXM6IFsneCcsICd5JywgJ2V4aXN0cycsICdhbGl2ZScsICdhbHBoYScsICdhbmdsZSddLFxuICAgIH0pLFxuICAgIFRFWFQ6IG5ldyBNZW1lbnRvQ3JlYXRvcih7XG4gICAgICAgIHByaW1pdGl2ZXM6IFsndGV4dCddLFxuICAgIH0pLFxufTtcblxuY3JlYXRvcnMuQU5JTUFUSU9OX01BTkFHRVIgPSBuZXcgTWVtZW50b0NyZWF0b3Ioe1xuICAgIHJlZnM6IFsnY3VycmVudEFuaW0nXSxcbiAgICBuZXN0ZWQ6IHtcbiAgICAgICAgY3VycmVudEFuaW06IGNyZWF0b3JzLkFOSU1BVElPTixcbiAgICB9LFxuICAgIGFsaWFzZXM6IHtcbiAgICAgICAgcmVmczoge1xuICAgICAgICAgICAgY3VycmVudEFuaW06ICdjdXJyZW50QW5pbVJlZicsXG4gICAgICAgIH0sXG4gICAgfSxcbn0pO1xuXG5jcmVhdG9ycy5TUFJJVEUgPSBuZXcgTWVtZW50b0NyZWF0b3Ioe1xuICAgIHByaW1pdGl2ZXM6IFsncG9zaXRpb24ueCcsICdwb3NpdGlvbi55JywgJ2FsaXZlJywgJ2V4aXN0cycsICd2aXNpYmxlJywgJ3NjYWxlLngnLCAnc2NhbGUueScsICdhbmdsZSddLFxuICAgIG5lc3RlZDoge1xuICAgICAgICBhbmltYXRpb25zOiBjcmVhdG9ycy5BTklNQVRJT05fTUFOQUdFUixcbiAgICB9LFxuICAgIGN1c3RvbToge1xuICAgICAgICBib2R5OiB7XG4gICAgICAgICAgICBjcmVhdGU6IChvcmlnaW5hdG9yKSA9PiB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcmlnaW5hdG9yLmJvZHkudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFBoYXNlci5QaHlzaWNzLkFSQ0FERTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjcmVhdG9ycy5CT0RZX0FSQ0FERS5jcmVhdGUob3JpZ2luYXRvci5ib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBQaGFzZXIuUGh5c2ljcy5QMkpTOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNyZWF0b3JzLkJPRFlfUDJKUy5jcmVhdGUob3JpZ2luYXRvci5ib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBQaGFzZXIuUGh5c2ljcy5OSU5KQTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjcmVhdG9ycy5CT0RZX05JTkpBLmNyZWF0ZShvcmlnaW5hdG9yLmJvZHkpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoYFVua25vd24gYm9keSB0eXBlOiAke29yaWdpbmF0b3IuYm9keS50eXBlfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXN0b3JlOiAob3JpZ2luYXRvciwgbWVtZW50bykgPT4ge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAob3JpZ2luYXRvci5ib2R5LnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBQaGFzZXIuUGh5c2ljcy5BUkNBREU6XG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdG9ycy5CT0RZX0FSQ0FERS5yZXN0b3JlKG9yaWdpbmF0b3IuYm9keSwgbWVtZW50byk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBQaGFzZXIuUGh5c2ljcy5QMkpTOlxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRvcnMuQk9EWV9QMkpTLnJlc3RvcmUob3JpZ2luYXRvci5ib2R5LCBtZW1lbnRvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFBoYXNlci5QaHlzaWNzLk5JTkpBOlxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRvcnMuQk9EWV9OSU5KQS5yZXN0b3JlKG9yaWdpbmF0b3IuYm9keSwgbWVtZW50byk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKGBVbmtub3duIGJvZHkgdHlwZTogJHtvcmlnaW5hdG9yLmJvZHkudHlwZX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH0sXG59KTtcblxuY3JlYXRvcnMuU1BSSVRFX0JBUkUgPSBuZXcgTWVtZW50b0NyZWF0b3Ioe1xuICAgIHByaW1pdGl2ZXM6IFsncG9zaXRpb24ueCcsICdwb3NpdGlvbi55JywgJ2FsaXZlJywgJ2V4aXN0cycsICd2aXNpYmxlJywgJ3NjYWxlLngnLCAnc2NhbGUueScsICdhbmdsZSddLFxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0b3JzO1xuIiwiLyoqXG4gVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiBDb3B5cmlnaHQgKGMpIDIwMTUgTWFjaWVqIChwcm94ZWxkKSBVcmJhbmVrXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiBTT0ZUV0FSRS5cbiAqL1xuaW1wb3J0IGNsb25lIGZyb20gJ2Nsb25lJztcbmltcG9ydCB1dGlscyBmcm9tICcuL3V0aWxzLmVzNic7XG5cbi8qKlxuICogUmVtZW1iZXJlZCBwcm9wZXJ0eSBpcyBhIGNvbW1vbiBuYW1lIGZvciBhbGwgcHJpbWl0aXZlcywgcmVmcywgbmVzdGVkLCBjdXN0b20gYW5kIGFycmF5c1xuICogUHJpbWl0aXZlcyBkb2VzIG5vdCBuZWNlc3NhcmlseSBiZSBwcmltaXRpdmUgdmFsdWVzICh0aGV5IHdpbGwgYmUgY29waWVkIHJlZ2FyZGxlc3Mgb2YgdGhlIHR5cGUpXG4gKiBBbGlhc2VzIGFyZSB1c2VkIGZvciBjaGFuZ2luZyBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBpbiB0aGUgbWVtZW50byAodG8gcHJldmVudCBuYW1lIGNsYXNoZXMpXG4gKiBAdHlwZSB7e3ByaW1pdGl2ZXM6IEFycmF5LCByZWZzOiBBcnJheSwgbmVzdGVkOiB7fSwgY3VzdG9tOiB7fSwgYXJyYXlzOiB7fSwgYWxpYXNlczoge319fVxuICovXG5jb25zdCBjb25maWdEZWZhdWx0ID0ge1xuICAgIHByaW1pdGl2ZXM6IFtdLFxuICAgIHJlZnM6IFtdLFxuICAgIG5lc3RlZDoge30sXG4gICAgY3VzdG9tOiB7fSxcbiAgICBhcnJheXM6IHt9LFxuICAgIGFsaWFzZXM6IHt9LFxufTtcblxuLyoqXG4gKiBDbGFzcyBmb3IgY3JlYXRpbmcgYW5kIHJlc3RvcmluZyBtZW1lbnRvIG9mIGRpZmZlcmVudCBjbGFzcyBvZiBvYmplY3RzXG4gKiBAY2xhc3NcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWVtZW50b0NyZWF0b3Ige1xuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIE1lbWVudG9DcmVhdG9yXG4gICAgICogQ29uZmlnIG9iamVjdCBzaG91bGQgaGF2ZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuICAgICAqIFRPRE86IGRlc2NyaWJlIGNvbmZpZyBzdHJ1Y3R1cmVcbiAgICAgKiBUT0RPOiBtaW5pZmljYXRpb24gYnkgdXNpbmcgc2hvcnRlciBrZXlzIGZvciBtZW1lbnRvIG9iamVjdHM6XG4gICAgICogKGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvOTcxOTY3Ni9qYXZhc2NyaXB0LW9iamVjdC1zaXplcylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gT2JqZWN0LmFzc2lnbih7fSwgY29uZmlnRGVmYXVsdCwgY29uZmlnKTtcbiAgICAgICAgTWVtZW50b0NyZWF0b3IuX3ZhbGlkYXRlQ29uZmlnKHRoaXMuY29uZmlnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcmltaXRpdmUgY29uZmlnIHZhbGlkYXRpb24gdG8gcHJldmVudCBtb3N0IGNvbW1vbiBlcnJvcnMgYXNhcFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGNvbmZpZyBpcyB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBzdGF0aWMgX3ZhbGlkYXRlQ29uZmlnKGNvbmZpZykge1xuICAgICAgICBjb25zdCB7IHByaW1pdGl2ZXMsIHJlZnMsIG5lc3RlZCwgY3VzdG9tLCBhcnJheXMgfSA9IGNvbmZpZztcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJpbWl0aXZlcykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJpbWl0aXZlcyBzaG91bGQgYmUgYW4gYXJyYXknKTtcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShyZWZzKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZWZzIHNob3VsZCBiZSBhbiBhcnJheScpO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobmVzdGVkKSB8fCB0eXBlb2YgbmVzdGVkICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCduZXN0ZWQgc2hvdWxkIGJlIGFuIG9iamVjdCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYXJyYXlzIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYXJyYXlzKSB8fCB0eXBlb2YgY3VzdG9tICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcImFycmF5c1wiIHZhbHVlIChpbiBjb25maWcpIHNob3VsZCBiZSBhbiBvYmplY3QnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhhcnJheXMpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3JlYXRvciA9IGFycmF5c1twcm9wXTtcbiAgICAgICAgICAgICAgICBpZiAoIShjcmVhdG9yIGluc3RhbmNlb2YgTWVtZW50b0NyZWF0b3IgfHwgY3JlYXRvciA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FycmF5cyBzaG91bGQgaGF2ZSBNZW1lbnRvQ3JlYXRvciBpbnN0YW5jZSBvciB1bmRlZmluZWQgYXMgYSB2YWx1ZSBmb3IgZWFjaCBwcm9wZXJ0eScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGN1c3RvbSB2YWxpZGF0aW9uXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGN1c3RvbSkgfHwgdHlwZW9mIGN1c3RvbSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY3VzdG9tIHNob3VsZCBiZSBhbiBvYmplY3QnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhjdXN0b20pKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvciA9IGN1c3RvbVtwcm9wXTtcbiAgICAgICAgICAgICAgICBpZiAoZGVzY3JpcHRvci5jcmVhdGUgPT09IHVuZGVmaW5lZCB8fCBkZXNjcmlwdG9yLnJlc3RvcmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2N1c3RvbSBzaG91bGQgaGF2ZSBjcmVhdGUgYW5kIHJlc3RvcmUgbWV0aG9kcyBmb3IgZWFjaCBjdXN0b20gcHJvcGVydHknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhbGlhcyBmb3IgZ2l2ZW4gcHJvcGVydHkgKGluIGdpdmVuIHR5cGUgLSBAcGFyYW0gY29uZikgaXMgYXZhaWxhYmxlXG4gICAgICogVGhpcyBtZXRob2QgaXMgdXNlZCB0byBwcmV2ZW50IGNsYXNoZXMgd2hlbiB0aGUgc2FtZSBwcm9wZXJ5IGhhcyB0byBiZSBzYXZlZCBpbiBtZW1lbnRvIGluIG1vcmUgdGhhbiBvbmUgd2F5XG4gICAgICogKGUuZy4gYXMgcmVmZXJlbmNlIGFuZCBjdXN0b20pXG4gICAgICogQHBhcmFtIGNvbmYgdHlwZSBvZiBwcm9wZXJ0eSAocHJpbWl0aXZlcy9uZXN0ZWQvcmVmcy9jdXN0b20vYXJyYXlzKVxuICAgICAqIEBwYXJhbSBwcm9wIHByb3BlcnR5IHRvIG1ha2UgYWxpYXMgZm9yXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBhbGlhc2VkIHByb3BlcnR5IG5hbWUgb3IgcGFzc2VkIEBwcm9wIGlmIGFsaWFzIG5vdCBmb3VuZC9zcGVjaWZpZWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hbGlhc2lmeShjb25mLCBwcm9wKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5hbGlhc2VzW2NvbmZdICYmIHRoaXMuY29uZmlnLmFsaWFzZXNbY29uZl1bcHJvcF0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5hbGlhc2VzW2NvbmZdW3Byb3BdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyByb3VnaCBzaXplIG9mIHRoZSBtZW1lbnRvIGluIGJ5dGVzXG4gICAgICogVXNlZCBmb3IgZGVidWdnaW5nXG4gICAgICogQHBhcmFtIG1lbWVudG8gbWVtZW50byBvYmplY3QgcmV0dXJuZWQgYnkge0BsaW5rIE1lbWVudG9DcmVhdG9yLmNyZWF0ZX0gbWV0aG9kIG9mIHRoaXMgbWVtZW50byBjcmVhdG9yXG4gICAgICogQHJldHVybiB7bnVtYmVyfSByb3VnaCBvYmplY3Qgc2l6ZSAoaW4gYnl0ZXMpXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBUT0RPOiBtYWtlIGl0IG1vcmUgYWNjdXJhdGUgKGhhbmRsZSBkaWZmZXJlbnQgdHlwZXMgb2YgcHJvcGVydGllcylcbiAgICAgKi9cbiAgICBfY2FsY3VsYXRlTWVtZW50b1NpemUobWVtZW50bykge1xuICAgICAgICBsZXQgYnl0ZXMgPSAwO1xuXG4gICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiB0aGlzLmNvbmZpZy5wcmltaXRpdmVzKSB7XG4gICAgICAgICAgICBjb25zdCBhbGlhcyA9IHRoaXMuX2FsaWFzaWZ5KCdwcmltaXRpdmVzJywgcHJvcCk7XG4gICAgICAgICAgICBieXRlcyArPSB1dGlscy5yb3VnaFNpemVPZk9iamVjdCh1dGlscy5nZXRQcm9wZXJ0eShtZW1lbnRvLCBhbGlhcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGhpcyBpcyBwb3RlbnRpYWxseSBkYW5nZXJvdXNcbiAgICAgICAgLy8gY3VzdG9tIG1lbWVudG9zIGhhcyBubyBkZWZpbmVkIHN0cnVjdHVyZVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLmNvbmZpZy5jdXN0b20pKSB7XG4gICAgICAgICAgICBjb25zdCBhbGlhcyA9IHRoaXMuX2FsaWFzaWZ5KCdjdXN0b20nLCBrZXkpO1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB1dGlscy5nZXRQcm9wZXJ0eShtZW1lbnRvLCBhbGlhcyk7XG4gICAgICAgICAgICBieXRlcyArPSB1dGlscy5yb3VnaFNpemVPZk9iamVjdCh2YWx1ZSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyh0aGlzLmNvbmZpZy5uZXN0ZWQpKSB7XG4gICAgICAgICAgICBjb25zdCBuZXN0ZWRDcmVhdG9yID0gdGhpcy5jb25maWcubmVzdGVkW3Byb3BdO1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSB0aGlzLl9hbGlhc2lmeSgnbmVzdGVkJywgcHJvcCk7XG4gICAgICAgICAgICBjb25zdCBuZXN0ZWREYXRhID0gdXRpbHMuZ2V0UHJvcGVydHkobWVtZW50bywgYWxpYXMpO1xuICAgICAgICAgICAgYnl0ZXMgKz0gbmVzdGVkQ3JlYXRvci5fY2FsY3VsYXRlTWVtZW50b1NpemUobmVzdGVkRGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYnl0ZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJpbWl0aXZlIHJlbWVtYmVyZWQgcHJvcGVydGllcyBhcmUgc3RvcmVkIGFzIGEgY29weSBvZiB0aGVpciBvcmlnaW5hbCB2YWx1ZSAoZnJvbSBvcmlnaW5hdG9yKVxuICAgICAqIFByaW1pdGl2ZXMgc2hvdWxkIGJlIHByaW1pdGl2ZSB2YWx1ZXMgb3Igc21hbGwgb2JqZWN0cyB3aXRoIG9ubHkgYSBmZXcgcHJvcGVydGllc1xuICAgICAqIEFsaWFzZXMgYXJlIHBvc3NpYmxlIHRvIHByZXZlbnQgY2xhc2hlcyB3aXRoIGRpZmZlcmVudCBraW5kIG9mIHJlbWVtYmVyZWQgcHJvcGVydGllc1xuICAgICAqIEBwYXJhbSBvcmlnaW5hdG9yXG4gICAgICogQHBhcmFtIHZlc3NlbCBjb250YWluZXIgb24gd2hpY2ggcmVtZW1iZXJlZCBwcm9wZXJ0aWVzIHdpbGwgYmUgc2V0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlUHJpbWl0aXZlc01lbWVudG8ob3JpZ2luYXRvciwgdmVzc2VsKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiB0aGlzLmNvbmZpZy5wcmltaXRpdmVzKSB7XG4gICAgICAgICAgICAvLyByZXNvbHZlIGZpbmFsIG5hbWUgb2YgdGhlIHJlbWVtYmVyZWQgcHJvcGVydHkgdXNlZCBpbiB0aGUgbWVtZW50b1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSB0aGlzLl9hbGlhc2lmeSgncHJpbWl0aXZlcycsIHByb3ApO1xuXG4gICAgICAgICAgICAvLyBjbG9uZSBwcm9wZXJ0eVxuICAgICAgICAgICAgLy8gcHJvcGVydHkgY2Fubm90IGJlIGNpcmN1bGFyIG9iamVjdFxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBjbG9uZSh1dGlscy5nZXRQcm9wZXJ0eShvcmlnaW5hdG9yLCBwcm9wKSwgZmFsc2UpO1xuXG4gICAgICAgICAgICAvLyBzYXZlIHByb3BlcnR5IGNvcHkgb24gdGhlIHZlc3NlbFxuICAgICAgICAgICAgdXRpbHMuc2V0UHJvcGVydHkodmVzc2VsLCBhbGlhcywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVmcyByZW1lbWJlcmVkIHByb3BlcnRpZXMgYXJlIHN0b3JlZCBhcyBhIHJlc3VsdCBvZiBhc3NpZ25tZW50XG4gICAgICogKG9iamVjdHMgYXJlIG5vdCBjb3BpZWQsIG9ubHkgYW5vdGhlciByZWZlcmVuY2UgaXMgY3JlYXRlZClcbiAgICAgKiBOb3RlOiBUaGlzIGNhbiBwcmV2ZW50IGdhcmJhZ2UgY29sbGVjdGlvbiBvZiBzb21lIG9iamVjdHNcbiAgICAgKiBBbGlhc2VzIGFyZSBwb3NzaWJsZSB0byBwcmV2ZW50IGNsYXNoZXMgd2l0aCBkaWZmZXJlbnQga2luZCBvZiByZW1lbWJlcmVkIHByb3BlcnRpZXNcbiAgICAgKiBAcGFyYW0gb3JpZ2luYXRvclxuICAgICAqIEBwYXJhbSB2ZXNzZWwgY29udGFpbmVyIG9uIHdoaWNoIHJlbWVtYmVyZWQgcHJvcGVydGllcyB3aWxsIGJlIHNldFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NyZWF0ZVJlZnNNZW1lbnRvKG9yaWdpbmF0b3IsIHZlc3NlbCkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlZiBvZiB0aGlzLmNvbmZpZy5yZWZzKSB7XG4gICAgICAgICAgICAvLyByZXNvbHZlIGZpbmFsIG5hbWUgb2YgdGhlIHJlbWVtYmVyZWQgcHJvcGVydHkgdXNlZCBpbiB0aGUgbWVtZW50b1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSB0aGlzLl9hbGlhc2lmeSgncmVmcycsIHJlZik7XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSBuZXcgcmVmZXJlbmNlIHRvIHRoZSB2YWx1ZSBob2xkIGJ5IG9yaWdpbmF0b3JcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gdXRpbHMuZ2V0UHJvcGVydHkob3JpZ2luYXRvciwgcmVmKTtcblxuICAgICAgICAgICAgLy8gc2F2ZSB0aGF0IHJlZmVyZW5jZSBvbiB0aGUgdmVzc2VsXG4gICAgICAgICAgICB1dGlscy5zZXRQcm9wZXJ0eSh2ZXNzZWwsIGFsaWFzLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gcmVtZW1iZXJlZCBwcm9wZXJ0aWVzIGFyZSBzdG9yZWQgKGFuZCByZXN0b3JlZCkgdXNpbmcgdXNlci1wcm92aWRlZCBvcGVyYXRpb25cbiAgICAgKiBJdCBjYW4gYmUgZG9uZSBpbiBjb25maWd1cmF0aW9uIHByb2Nlc3MgKHdoaWxlIGNyZWF0aW5nIE1lbWVudG9DcmVhdG9yIGluc3RhbmNlKVxuICAgICAqIEFsaWFzZXMgYXJlIHBvc3NpYmxlIHRvIHByZXZlbnQgY2xhc2hlcyB3aXRoIGRpZmZlcmVudCBraW5kIG9mIHJlbWVtYmVyZWQgcHJvcGVydGllc1xuICAgICAqIEBwYXJhbSBvcmlnaW5hdG9yXG4gICAgICogQHBhcmFtIHZlc3NlbCBjb250YWluZXIgb24gd2hpY2ggcmVtZW1iZXJlZCBwcm9wZXJ0aWVzIHdpbGwgYmUgc2V0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlQ3VzdG9tTWVtZW50byhvcmlnaW5hdG9yLCB2ZXNzZWwpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5jb25maWcuY3VzdG9tKSkge1xuICAgICAgICAgICAgLy8gcmVzb2x2ZSBmaW5hbCBuYW1lIG9mIHRoZSByZW1lbWJlcmVkIHByb3BlcnR5IHVzZWQgaW4gdGhlIG1lbWVudG9cbiAgICAgICAgICAgIGNvbnN0IGFsaWFzID0gdGhpcy5fYWxpYXNpZnkoJ2N1c3RvbScsIGtleSk7XG5cbiAgICAgICAgICAgIC8vIHJldHJpZXZlIGRlc2NyaXB0b3IgKG9iamVjdCB3aXRoIGNyZWF0ZSgpIGFuZCByZXN0b3JlKCkgbWV0aG9kcykgZnJvbSBjb25maWd1YXJ0aW9uXG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdG9yID0gdGhpcy5jb25maWcuY3VzdG9tW2tleV07XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSBtZW1lbnRvIG9mIHRoZSByZW1lbWJlcmVkIHByb3BlcnR5IHVzaW5nIHByb3ZpZGVkIGRlc2NyaXB0b3JcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGVzY3JpcHRvci5jcmVhdGUob3JpZ2luYXRvcik7XG5cbiAgICAgICAgICAgIC8vIHNhdmUgdGhhdCBwcm9wZXJ0eSBtZW1lbnRvIG9uIHRoZSB2ZXNzZWxcbiAgICAgICAgICAgIHV0aWxzLnNldFByb3BlcnR5KHZlc3NlbCwgYWxpYXMsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE5lc3RlZCByZW1lbWJlcmVkIHByb3BlcnRpZXMgYXJlIHN0b3JlZCAoYW5kIHJlc3RvcmVkKSB1c2luZyB1c2VyLXByb3ZpZGVkIE1lbWVudG9DcmVhdG9yXG4gICAgICogSXQgY2FuIGJlIGRvbmUgaW4gY29uZmlndXJhdGlvbiBwcm9jZXNzICh3aGlsZSBjcmVhdGluZyBNZW1lbnRvQ3JlYXRvciBpbnN0YW5jZSlcbiAgICAgKiBJdCBpcyBlc3BlY2lhbGx5IHVzZWZ1bCB3aGVuIE1lbWVudG9DcmVhdG9yLCBmb3Igc29tZSBwcm9wZXJ0eSB0aGF0IGlzIHByZXNlbnQgaW4gb3JpZ2luYXRvcixcbiAgICAgKiBoYXMgYWxyZWFkeSBiZWVuIGNyZWF0ZWQgYW5kIGNhbiBiZSByZXVzZWRcbiAgICAgKiBBbGlhc2VzIGFyZSBwb3NzaWJsZSB0byBwcmV2ZW50IGNsYXNoZXMgd2l0aCBkaWZmZXJlbnQga2luZCBvZiByZW1lbWJlcmVkIHByb3BlcnRpZXNcbiAgICAgKiBAcGFyYW0gb3JpZ2luYXRvclxuICAgICAqIEBwYXJhbSB2ZXNzZWwgY29udGFpbmVyIG9uIHdoaWNoIHJlbWVtYmVyZWQgcHJvcGVydGllcyB3aWxsIGJlIHNldFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NyZWF0ZU5lc3RlZE1lbWVudG8ob3JpZ2luYXRvciwgdmVzc2VsKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyh0aGlzLmNvbmZpZy5uZXN0ZWQpKSB7XG4gICAgICAgICAgICAvLyByZXNvbHZlIGZpbmFsIG5hbWUgb2YgdGhlIHJlbWVtYmVyZWQgcHJvcGVydHkgdXNlZCBpbiB0aGUgbWVtZW50b1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSB0aGlzLl9hbGlhc2lmeSgnbmVzdGVkJywgcHJvcCk7XG5cbiAgICAgICAgICAgIC8vIHJldHJpZXZlIE1lbWVudG9DcmVhdG9yIGZvciB0aGlzIHNwZWNpZmljIHByb3AgZnJvbSBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBjb25zdCBuZXN0ZWRDcmVhdG9yID0gdGhpcy5jb25maWcubmVzdGVkW3Byb3BdO1xuXG4gICAgICAgICAgICAvLyByZXRyaWV2ZSBwcm9wIHZhbHVlXG4gICAgICAgICAgICBjb25zdCBuZXN0ZWRPYmogPSB1dGlscy5nZXRQcm9wZXJ0eShvcmlnaW5hdG9yLCBwcm9wKTtcblxuICAgICAgICAgICAgLy8gdXNlIG5lc3RlZCBNZW1lbnRvQ3JlYXRvciB0byBjcmVhdGUgbmVzdGVkIG9iamVjdCBtZW1lbnRvXG4gICAgICAgICAgICBjb25zdCBtZW1lbnRvID0gbmVzdGVkQ3JlYXRvci5jcmVhdGUobmVzdGVkT2JqKTtcblxuICAgICAgICAgICAgLy8gc2F2ZSB0aGF0IG9iamVjdCBtZW1lbnRvIG9uIHRoZSB2ZXNzZWxcbiAgICAgICAgICAgIHV0aWxzLnNldFByb3BlcnR5KHZlc3NlbCwgYWxpYXMsIG1lbWVudG8pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXJyYXlzIHJlbWVtYmVyZWQgcHJvcGVydGllcyBhcmUgc3RvcmVkIGFzIGZvbGxvd3M6XG4gICAgICogLSBuZXcgYXJyYXkgaXMgY3JlYXRlZFxuICAgICAqIC0gZm9yIGVhY2ggZWxlbWVudCBvZiB0aGF0IGFycmF5XG4gICAgICogICAtIGlmIE1lbWVudG9DcmVhdG9yIHdhcyBzcGVjaWZpZWQgKGZvciBlbGVtZW50KSB0aGVuIGl0J3MgdXNlZCB0byBjcmVhdGUgZWxlbWVudCdzIG1lbWVudG9cbiAgICAgKiAgIC0gcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IGFzIHdlbGwgYXMgb3B0aW9uYWwgbWVtZW50byBvZiB0aGF0IGVsZW1lbnQgaXMgcHVzaCB0byB0aGUgYXJyYXlcbiAgICAgKiAtIGFycmF5IGZyb20gZmlyc3Qgc3RlcCBpcyBzZXQgYXMgYSBmaW5hbCBtZW1lbnRvIG9mIGFycmF5IHJlbWVtYmVyZWQgcHJvcGVydHkgKGFycmF5IGZyb20gb3JpZ2luYXRvcilcbiAgICAgKiBUaGlzIHNob3VsZCBlbnN1cmUgcmVzdG9yaW5nIGFycmF5J3MgZWxlbWVudCBldmVuIGlmIGl0IHdhcyByZW1vdmVkIGZyb20gaXQgaW4gdGhlIGZ1dHVyZVxuICAgICAqIEFsaWFzZXMgYXJlIHBvc3NpYmxlIHRvIHByZXZlbnQgY2xhc2hlcyB3aXRoIGRpZmZlcmVudCBraW5kIG9mIHJlbWVtYmVyZWQgcHJvcGVydGllc1xuICAgICAqIEBwYXJhbSBvcmlnaW5hdG9yXG4gICAgICogQHBhcmFtIHZlc3NlbCBjb250YWluZXIgb24gd2hpY2ggcmVtZW1iZXJlZCBwcm9wZXJ0aWVzIHdpbGwgYmUgc2V0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlQXJyYXlzTWVtZW50byhvcmlnaW5hdG9yLCB2ZXNzZWwpIHtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKHRoaXMuY29uZmlnLmFycmF5cykpIHtcbiAgICAgICAgICAgIC8vIHJlc29sdmUgZmluYWwgbmFtZSBvZiB0aGUgcmVtZW1iZXJlZCBwcm9wZXJ0eSB1c2VkIGluIHRoZSBtZW1lbnRvXG4gICAgICAgICAgICBjb25zdCBhbGlhcyA9IHRoaXMuX2FsaWFzaWZ5KCdhcnJheXMnLCBwcm9wKTtcblxuICAgICAgICAgICAgLy8gcmV0cmlldmUgTWVtZW50b0NyZWF0b3IgdXNlZCBmb3IgZWFjaCBlbGVtZW50IGluIGFycmF5XG4gICAgICAgICAgICBjb25zdCBpbkFycmF5RWxlbU1lbWVudG9DcmVhdG9yID0gdGhpcy5jb25maWcuYXJyYXlzW3Byb3BdO1xuXG4gICAgICAgICAgICAvLyBjcmVhdGUgbmV3IGFycmF5IC0gd2hpY2ggd2lsbCBiZSBtZW1lbnRvIG9mIG9yaWdpbmF0b3IgcHJvcFxuICAgICAgICAgICAgLy8gaXQgaXMgYWx3YXlzIGEgbmV3IGFycmF5XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IFtdO1xuXG4gICAgICAgICAgICAvLyByZXRyaWV2ZSByZW1lbWJlcmVkIHByb3BlcnR5IGZyb20gb3JpZ2luYXRvclxuICAgICAgICAgICAgY29uc3QgbWVtb3JhYmxlID0gdXRpbHMuZ2V0UHJvcGVydHkob3JpZ2luYXRvciwgcHJvcCwgW10pO1xuXG4gICAgICAgICAgICAvLyBpdGVyYXRlIG92ZXIgZXZlcnkgZWxlbWVudCBvZiBvcmlnaW5hdG9yJ3MgcmVtZW1iZXJlZCBwcm9wZXJ0eSAtIG9yaWdpbmF0b3IncyBhcnJheVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIG1lbW9yYWJsZSkge1xuICAgICAgICAgICAgICAgIC8vIGlmIGNyZWF0b3IgaXMgc3BlY2lmaWVkLCB0aGVuIGNyZWF0ZSBtZW1lbnRvIGZvciBlYWNoIGVsZW1lbnQgb2YgYW4gYXJyYXlcbiAgICAgICAgICAgICAgICBpZiAoaW5BcnJheUVsZW1NZW1lbnRvQ3JlYXRvcikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9fcmVmOiBlbGVtLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVtZW50bzogaW5BcnJheUVsZW1NZW1lbnRvQ3JlYXRvci5jcmVhdGUoZWxlbSksXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgX19yZWY6IGVsZW0sXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc2F2ZSBtZW1lbnRvIG9uIHRoZSB2ZXNzZWxcbiAgICAgICAgICAgIHV0aWxzLnNldFByb3BlcnR5KHZlc3NlbCwgYWxpYXMsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgbWVtZW50byBvZiBwYXNzZWQgb3JpZ2luYXRvci4gVG8gZGV0ZXJtaW5lIHdoYXQgcHJvcGVydGllcyBzaG91bGQgYmUgcmVtZW1iZXJlZCBhbmQgaG93IHNob3VsZCB0aGV5IGJlXG4gICAgICogcmVtZW1iZXJlZCBjb25maWd1cmF0aW9uIG9iamVjdCBpcyB1c2VkIHRoYXQgd2FzIHBhc3NlZCB0byBjb25zdHJ1Y3RvciBvZiB7QGxpbmsgTWVtZW50b0NyZWF0b3IuY29uc3RydWN0b3J9XG4gICAgICogQHBhcmFtIG9yaWdpbmF0b3JcbiAgICAgKiBAc2VlIHtAbGluayBNZW1lbnRvQ3JlYXRvci5yZXN0b3JlfVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gbWVtZW50byBvZiBvcmlnaW5hdG9yXG4gICAgICovXG4gICAgY3JlYXRlKG9yaWdpbmF0b3IpIHtcbiAgICAgICAgLy8gY3JlYXRlIG9iamVjdCBmb3Igc3RvcmluZyBtZW1lbnRvcyBvZiBhbGwga2luZHMgb2YgcmVtZW1iZXJlZCBwcm9wZXJ0aWVzXG4gICAgICAgIGNvbnN0IG1lbWVudG8gPSB7fTtcblxuICAgICAgICB0aGlzLl9jcmVhdGVQcmltaXRpdmVzTWVtZW50byhvcmlnaW5hdG9yLCBtZW1lbnRvKTtcblxuICAgICAgICB0aGlzLl9jcmVhdGVSZWZzTWVtZW50byhvcmlnaW5hdG9yLCBtZW1lbnRvKTtcblxuICAgICAgICB0aGlzLl9jcmVhdGVDdXN0b21NZW1lbnRvKG9yaWdpbmF0b3IsIG1lbWVudG8pO1xuXG4gICAgICAgIHRoaXMuX2NyZWF0ZU5lc3RlZE1lbWVudG8ob3JpZ2luYXRvciwgbWVtZW50byk7XG5cbiAgICAgICAgdGhpcy5fY3JlYXRlQXJyYXlzTWVtZW50byhvcmlnaW5hdG9yLCBtZW1lbnRvKTtcblxuICAgICAgICByZXR1cm4gbWVtZW50bztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcmltaXRpdmVzIHJlbWVtYmVyZWQgcHJvcGVydGllcyBmcm9tIG1lbWVudG8gYXJlIGNvcGllZCBhbmQgc2V0IG9uIG9yaWdpbmF0b3Igb2JqZWN0XG4gICAgICogQWxpYXNlcyBhcmUgcG9zc2libGUgdG8gcHJldmVudCBjbGFzaGVzIHdpdGggZGlmZmVyZW50IGtpbmQgb2YgcmVtZW1iZXJlZCBwcm9wZXJ0aWVzXG4gICAgICogQHBhcmFtIG9yaWdpbmF0b3Igc2hvdWxkIGJlIHRoZSBzYW1lIG9iamVjdCB0aGF0IHdhcyBwYXNzZWQgdG8gY3JlYXRlIG1ldGhvZFxuICAgICAqIEBwYXJhbSBtZW1lbnRvIHNob3VsZCBiZSBtZW1lbnRvIHJldHVybmVkIGJ5IGNyZWF0ZSBtZXRob2RcbiAgICAgKiBAc2VlIHtAbGluayBNZW1lbnRvQ3JlYXRvci5jcmVhdGV9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVzdG9yZVByaW1pdGl2ZXMob3JpZ2luYXRvciwgbWVtZW50bykge1xuICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgdGhpcy5jb25maWcucHJpbWl0aXZlcykge1xuICAgICAgICAgICAgLy8gcmVzb2x2ZSBmaW5hbCBuYW1lIG9mIHRoZSByZW1lbWJlcmVkIHByb3BlcnR5IHVzZWQgaW4gdGhlIG1lbWVudG9cbiAgICAgICAgICAgIGNvbnN0IGFsaWFzID0gdGhpcy5fYWxpYXNpZnkoJ3ByaW1pdGl2ZXMnLCBwcm9wKTtcblxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgcmVtZW1iZXJlZCBwcm9wZXJ0eSBleGlzdHMgaW4gbWVtZW50b1xuICAgICAgICAgICAgLy8gdGhlIHJlYXNvbiBmb3IgdGhpcyBpcyB0aGF0IGl0IGNvdWxkIGhhdmUgYmVlbiByZW1vdmVkIHRocm91Z2ggdGhlIG1lbWVudG8gbWluaWZpY2F0aW9uXG4gICAgICAgICAgICBpZiAodXRpbHMuaGFzUHJvcGVydHkobWVtZW50bywgYWxpYXMpKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgc28sIGV4dHJhY3QgcmVtZW1iZXJlZCBwcm9wZXJ0eSBmcm9tIG1lbWVudG8gYW5kIGNvcHkgaXQncyB2YWx1ZVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY2xvbmUodXRpbHMuZ2V0UHJvcGVydHkobWVtZW50bywgYWxpYXMpKTtcblxuICAgICAgICAgICAgICAgIC8vIHNldCB0aGF0IGNvcGllZCB2YWx1ZSBvbiBvcmlnaW5hdG9yIG9iamVjdCAtIHVzZSBvcmlnaW5hbCBuYW1lLCBub3QgYWxpYXMgLSBhbGlhc2VzIGFyZSBvbmx5IHVzZWQgaW50ZXJuYWxseVxuICAgICAgICAgICAgICAgIHV0aWxzLnNldFByb3BlcnR5KG9yaWdpbmF0b3IsIHByb3AsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgcmVtZW1iZXJlZCBwcm9wZXJ0eSBkb2VzIG5vdCBleGlzdCBpbiBtZW1lbnRvIHRoZW4gc2ltcGx5IHNraXAgaXRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZvciByZWZlcmVuY2VzIHRoZSB2YWx1ZXMgZnJvbSBtZW1lbnRvIGFyZSBzaW1wbHkgYXNzaWduZWQgb24gb3JpZ2luYXRvciBvYmplY3QgKG5vdCBjb3BpZWQpXG4gICAgICogQWxpYXNlcyBhcmUgcG9zc2libGUgdG8gcHJldmVudCBjbGFzaGVzIHdpdGggZGlmZmVyZW50IGtpbmQgb2YgcmVtZW1iZXJlZCBwcm9wZXJ0aWVzXG4gICAgICogQHBhcmFtIG9yaWdpbmF0b3Igc2hvdWxkIGJlIHRoZSBzYW1lIG9iamVjdCB0aGF0IHdhcyBwYXNzZWQgdG8gY3JlYXRlIG1ldGhvZFxuICAgICAqIEBwYXJhbSBtZW1lbnRvIHNob3VsZCBiZSBtZW1lbnRvIHJldHVybmVkIGJ5IGNyZWF0ZSBtZXRob2RcbiAgICAgKiBAc2VlIHtAbGluayBNZW1lbnRvQ3JlYXRvci5jcmVhdGV9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVzdG9yZVJlZnMob3JpZ2luYXRvciwgbWVtZW50bykge1xuICAgICAgICBmb3IgKGNvbnN0IHJlZiBvZiB0aGlzLmNvbmZpZy5yZWZzKSB7XG4gICAgICAgICAgICAvLyByZXNvbHZlIGZpbmFsIG5hbWUgb2YgdGhlIHJlbWVtYmVyZWQgcHJvcGVydHkgdXNlZCBpbiB0aGUgbWVtZW50b1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSB0aGlzLl9hbGlhc2lmeSgncmVmcycsIHJlZik7XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHJlbWVtYmVyZWQgcHJvcGVydHkgZXhpc3RzIGluIG1lbWVudG9cbiAgICAgICAgICAgIC8vIHRoZSByZWFzb24gZm9yIHRoaXMgaXMgdGhhdCBpdCBjb3VsZCBoYXZlIGJlZW4gcmVtb3ZlZCB0aHJvdWdoIHRoZSBtZW1lbnRvIG1pbmlmaWNhdGlvblxuICAgICAgICAgICAgaWYgKHV0aWxzLmhhc1Byb3BlcnR5KG1lbWVudG8sIGFsaWFzKSkge1xuICAgICAgICAgICAgICAgIC8vIGlmIHNvLCBleHRyYWN0IHJlbWVtYmVyZWQgcHJvcGVydHkgZnJvbSBtZW1lbnRvIChub3QgY29waWVkKVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gdXRpbHMuZ2V0UHJvcGVydHkobWVtZW50bywgYWxpYXMpO1xuXG4gICAgICAgICAgICAgICAgLy8gc2V0IHRoYXQgdmFsdWUgb24gb3JpZ2luYXRvciBvYmplY3QgLSB1c2Ugb3JpZ2luYWwgbmFtZSwgbm90IGFsaWFzIC0gYWxpYXNlcyBhcmUgb25seSB1c2VkIGludGVybmFsbHlcbiAgICAgICAgICAgICAgICB1dGlscy5zZXRQcm9wZXJ0eShvcmlnaW5hdG9yLCByZWYsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgcmVtZW1iZXJlZCBwcm9wZXJ0eSBkb2VzIG5vdCBleGlzdCBpbiBtZW1lbnRvIHRoZW4gc2ltcGx5IHNraXAgaXRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZvciBjdXN0b20gcmVtZW1iZXJlZCBwcm9wZXJ0aWVzIHVzZSBwcm92aWRlZCBkZXNjcmlwdG9yIHRvIHJlc3RvcmUgbWVtZW50b1xuICAgICAqIEFsaWFzZXMgYXJlIHBvc3NpYmxlIHRvIHByZXZlbnQgY2xhc2hlcyB3aXRoIGRpZmZlcmVudCBraW5kIG9mIHJlbWVtYmVyZWQgcHJvcGVydGllc1xuICAgICAqIEBwYXJhbSBvcmlnaW5hdG9yIHNob3VsZCBiZSB0aGUgc2FtZSBvYmplY3QgdGhhdCB3YXMgcGFzc2VkIHRvIGNyZWF0ZSBtZXRob2RcbiAgICAgKiBAcGFyYW0gbWVtZW50byBzaG91bGQgYmUgbWVtZW50byByZXR1cm5lZCBieSBjcmVhdGUgbWV0aG9kXG4gICAgICogQHNlZSB7QGxpbmsgTWVtZW50b0NyZWF0b3IuY3JlYXRlfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3Jlc3RvcmVDdXN0b20ob3JpZ2luYXRvciwgbWVtZW50bykge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLmNvbmZpZy5jdXN0b20pKSB7XG4gICAgICAgICAgICAvLyByZXNvbHZlIGZpbmFsIG5hbWUgb2YgdGhlIHJlbWVtYmVyZWQgcHJvcGVydHkgdXNlZCBpbiB0aGUgbWVtZW50b1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSB0aGlzLl9hbGlhc2lmeSgnY3VzdG9tJywga2V5KTtcblxuICAgICAgICAgICAgLy8gcmV0cmlldmUgcHJvcGVydHkgZGVzY3JpcHRvciAob2JqZWN0IHdpdGggY3JlYXRlKCkgYW5kIHJlc3RvcmUoKSBtZXRob2RzXG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdG9yID0gdGhpcy5jb25maWcuY3VzdG9tW2tleV07XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHJlbWVtYmVyZWQgcHJvcGVydHkgZXhpc3RzIGluIG1lbWVudG9cbiAgICAgICAgICAgIC8vIHRoZSByZWFzb24gZm9yIHRoaXMgaXMgdGhhdCBpdCBjb3VsZCBoYXZlIGJlZW4gcmVtb3ZlZCB0aHJvdWdoIHRoZSBtZW1lbnRvIG1pbmlmaWNhdGlvblxuICAgICAgICAgICAgaWYgKHV0aWxzLmhhc1Byb3BlcnR5KG1lbWVudG8sIGFsaWFzKSkge1xuICAgICAgICAgICAgICAgIC8vIGlmIHNvLCBleHRyYWN0IHJlbWVtYmVyZWQgcHJvcGVydHkgZnJvbSBtZW1lbnRvIChub3QgY29waWVkKVxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gdXRpbHMuZ2V0UHJvcGVydHkobWVtZW50bywgYWxpYXMpO1xuXG4gICAgICAgICAgICAgICAgLy8gcmVzdG9yZSBzdGF0ZSBvZiBuZXN0ZWRPYmogdXNpbmcgZGVzY3JpcHRvclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0b3IucmVzdG9yZShvcmlnaW5hdG9yLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHJlbWVtYmVyZWQgcHJvcGVydHkgZG9lcyBub3QgZXhpc3QgaW4gbWVtZW50byB0aGVuIHNpbXBseSBza2lwIGl0XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGb3IgbmVzdGVkIHJlbWVtYmVyZWQgcHJvcGVydGllcyB1c2UgYW5vdGhlciBtZW1lbnRvIGNyZWF0b3IgdG8gcmVzdG9yZSBtZW1lbnRvXG4gICAgICogVGhpcyBpcyBlc3BlY2lhbGx5IHVzZWZ1bCB3aGVuIG9iamVjdCdzIHByb3BlcnR5IHZhbHVlIGlzIGFub3RoZXIgdHlwZSBvZiBvYmplY3QgZm9yIHdoaWNoXG4gICAgICogd2UgYWxyZWFkeSBoYXZlIGNyZWF0b3IgcHJlcGFyZWQgKGUuZy4gYm9keSBvbiBzcHJpdGUpXG4gICAgICogQWxpYXNlcyBhcmUgcG9zc2libGUgdG8gcHJldmVudCBjbGFzaGVzIHdpdGggZGlmZmVyZW50IGtpbmQgb2YgcmVtZW1iZXJlZCBwcm9wZXJ0aWVzXG4gICAgICogQHBhcmFtIG9yaWdpbmF0b3Igc2hvdWxkIGJlIHRoZSBzYW1lIG9iamVjdCB0aGF0IHdhcyBwYXNzZWQgdG8gY3JlYXRlIG1ldGhvZFxuICAgICAqIEBwYXJhbSBtZW1lbnRvIHNob3VsZCBiZSBtZW1lbnRvIHJldHVybmVkIGJ5IGNyZWF0ZSBtZXRob2RcbiAgICAgKiBAc2VlIHtAbGluayBNZW1lbnRvQ3JlYXRvci5jcmVhdGV9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVzdG9yZU5lc3RlZChvcmlnaW5hdG9yLCBtZW1lbnRvKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyh0aGlzLmNvbmZpZy5uZXN0ZWQpKSB7XG4gICAgICAgICAgICAvLyByZXNvbHZlIGZpbmFsIG5hbWUgb2YgdGhlIHJlbWVtYmVyZWQgcHJvcGVydHkgdXNlZCBpbiB0aGUgbWVtZW50b1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSB0aGlzLl9hbGlhc2lmeSgnbmVzdGVkJywgcHJvcCk7XG5cbiAgICAgICAgICAgIC8vIHJldHJpZXZlIG5lc3RlZCBtZW1lbnRvIGNyZWF0b3IgZnJvbSBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBjb25zdCBuZXN0ZWRDcmVhdG9yID0gdGhpcy5jb25maWcubmVzdGVkW3Byb3BdO1xuXG4gICAgICAgICAgICAvLyByZXRyaWV2ZSBuZXN0ZWQgb2JqZWN0IGZvciB3aGljaCBuZXN0ZWQgY3JlYXRvciB3aWxsIGJlIHVzZWRcbiAgICAgICAgICAgIGNvbnN0IG5lc3RlZE9iaiA9IHV0aWxzLmdldFByb3BlcnR5KG9yaWdpbmF0b3IsIHByb3ApO1xuXG4gICAgICAgICAgICAvLyByZXRyaWV2ZSBuZXN0ZWQgbWVtZW50b1xuICAgICAgICAgICAgY29uc3QgbmVzdGVkTWVtZW50byA9IHV0aWxzLmdldFByb3BlcnR5KG1lbWVudG8sIGFsaWFzKTtcblxuICAgICAgICAgICAgLy8gcmVzdG9yZSBzdGF0ZSBvZiBuZXN0ZWRPYmogdXNpbmcgbmVzdGVkIG1lbWVudG8gY3JlYXRvciBhbmQgbmVzdGVkIG1lbWVudG9cbiAgICAgICAgICAgIG5lc3RlZENyZWF0b3IucmVzdG9yZShuZXN0ZWRPYmosIG5lc3RlZE1lbWVudG8pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRm9yIGFycmF5cyByZW1lbWJlcmVkIHByb3BlcnRpZXMgcmVzdG9yZSBhcnJheSBlbGVtZW50cyBhZGRpbmcgYWxsIHJlZmVyZW5jZXMgZnJvbSBtZW1lbnRvIHRvIG5ld2x5IGNyZWF0ZWQgYXJyYXlcbiAgICAgKiBhbmQgb3B0aW9uYWxseSByZXN0b3JpbmcgdGhlaXIgc3RhdGUgdXNpbmcgcHJvdmlkZWQgTWVtZW50b0NyZWF0b3IgKHBlciBlbGVtZW50KVxuICAgICAqIEFsaWFzZXMgYXJlIHBvc3NpYmxlIHRvIHByZXZlbnQgY2xhc2hlcyB3aXRoIGRpZmZlcmVudCBraW5kIG9mIHJlbWVtYmVyZWQgcHJvcGVydGllc1xuICAgICAqIEBwYXJhbSBvcmlnaW5hdG9yIHNob3VsZCBiZSB0aGUgc2FtZSBvYmplY3QgdGhhdCB3YXMgcGFzc2VkIHRvIGNyZWF0ZSBtZXRob2RcbiAgICAgKiBAcGFyYW0gbWVtZW50byBzaG91bGQgYmUgbWVtZW50byByZXR1cm5lZCBieSBjcmVhdGUgbWV0aG9kXG4gICAgICogQHNlZSB7QGxpbmsgTWVtZW50b0NyZWF0b3IuY3JlYXRlfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3Jlc3RvcmVBcnJheXMob3JpZ2luYXRvciwgbWVtZW50bykge1xuICAgICAgICAvLyBUT0RPOiBjb25zaWRlciBzb21lIG9wdGltaXphdGlvbjogcmlnaHQgbm93IGV2ZXJ5IHRpbWUgbWVtZW50byBpcyByZXN0b3JlZCBpdCBuZWVkcyB0byBjbGVhciBhbGwgYXJyYXkgYW5kIHRoZW5cbiAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKHRoaXMuY29uZmlnLmFycmF5cykpIHtcbiAgICAgICAgICAgIC8vIHJlc29sdmUgZmluYWwgbmFtZSBvZiB0aGUgcmVtZW1iZXJlZCBwcm9wZXJ0eSB1c2VkIGluIHRoZSBtZW1lbnRvXG4gICAgICAgICAgICBjb25zdCBhbGlhcyA9IHRoaXMuX2FsaWFzaWZ5KCdhcnJheXMnLCBwcm9wKTtcblxuICAgICAgICAgICAgLy8gcmV0cmlldmUgTWVtZW50b0NyZWF0b3IgdXNlZCBmb3IgZWFjaCBlbGVtZW50IGluIGFycmF5XG4gICAgICAgICAgICBjb25zdCBpbkFycmF5RWxlbU1lbWVudG9DcmVhdG9yID0gdGhpcy5jb25maWcuYXJyYXlzW3Byb3BdO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiByZW1lbWJlcmVkIHByb3BlcnR5IGV4aXN0cyBpbiBtZW1lbnRvXG4gICAgICAgICAgICAvLyB0aGUgcmVhc29uIGZvciB0aGlzIGlzIHRoYXQgaXQgY291bGQgaGF2ZSBiZWVuIHJlbW92ZWQgdGhyb3VnaCB0aGUgbWVtZW50byBtaW5pZmljYXRpb25cbiAgICAgICAgICAgIGlmICh1dGlscy5oYXNQcm9wZXJ0eShtZW1lbnRvLCBhbGlhcykpIHtcbiAgICAgICAgICAgICAgICAvLyByZXRyaWV2ZSBjdXJyZW50IGFycmF5IGZyb20gb3JpZ2luYXRvclxuICAgICAgICAgICAgICAgIGNvbnN0IG1lbW9yYWJsZSA9IHV0aWxzLmdldFByb3BlcnR5KG9yaWdpbmF0b3IsIHByb3AsIFtdKTtcblxuICAgICAgICAgICAgICAgIC8vIGNsZWFyIGFycmF5ICh0aGlzIHdpbGwgYWZmZWN0IGFsbCByZWZlcmVuY2VzIHRvIHRoZSBhcnJheSlcbiAgICAgICAgICAgICAgICBtZW1vcmFibGUubGVuZ3RoID0gMDtcblxuICAgICAgICAgICAgICAgIC8vIHJldHJpZXZlIGFycmF5IG1lbWVudG9cbiAgICAgICAgICAgICAgICBjb25zdCBhcnJheU1lbWVudG8gPSB1dGlscy5nZXRQcm9wZXJ0eShtZW1lbnRvLCBhbGlhcyk7XG5cbiAgICAgICAgICAgICAgICAvLyBpdGVyYXRlIG92ZXIgbWVtZW50b3Mgb2YgYXJyYXkgZWxlbWVudHNcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFycmF5RWxlbU1lbWVudG8gb2YgYXJyYXlNZW1lbnRvKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGdldCByZWZlcmVuY2UgdG8gb3JpZ2luYWwgZWxlbWVudF9fcmVmXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgbmVjZXNzYXJ5LCBiZWNhdXNlIHdlIG5lZWQgdG8gaGF2ZSBhIHdheSB0byBrbm93IHRvIHdoaWNoIG9iamVjdCBmcm9tIGFycmF5IGFwcGx5IGl0J3MgbWVtZW50b1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVtUmVmID0gYXJyYXlFbGVtTWVtZW50by5fX3JlZjtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBjcmVhdG9yIGlzIHNwZWNpZmllZCwgdGhlbiByZXN0b3JlIG1lbWVudG8gZm9yIGN1cnJlbnQgZWxlbWVudCBvZiBhbiBhcnJheVxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5BcnJheUVsZW1NZW1lbnRvQ3JlYXRvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5BcnJheUVsZW1NZW1lbnRvQ3JlYXRvci5yZXN0b3JlKGVsZW1SZWYsIGFycmF5RWxlbU1lbWVudG8ubWVtZW50byk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBwdXNoIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBhcnJheVxuICAgICAgICAgICAgICAgICAgICBtZW1vcmFibGUucHVzaChlbGVtUmVmKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBzZXQgZmluYWwgcmVzdWx0IG9uIHRoZSBvcmlnaW5hdG9yXG4gICAgICAgICAgICAgICAgdXRpbHMuc2V0UHJvcGVydHkob3JpZ2luYXRvciwgcHJvcCwgbWVtb3JhYmxlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgcmVtZW1iZXJlZCBwcm9wZXJ0eSBkb2VzIG5vdCBleGlzdCBpbiBtZW1lbnRvIHRoZW4gc2ltcGx5IHNraXAgaXRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc3RvcmVzIG1lbWVudG8gY3JlYXRlZCBieSB7QGxpbmsgTWVtZW50b0NyZWF0b3IuY3JlYXRlfSBtZXRob2RcbiAgICAgKiBAcGFyYW0gb3JpZ2luYXRvciBzaG91bGQgYmUgdGhlIHNhbWUgb2JqZWN0IHRoYXQgd2FzIHBhc3NlZCB0byBjcmVhdGUgbWV0aG9kXG4gICAgICogQHBhcmFtIG1lbWVudG8gc2hvdWxkIGJlIG1lbWVudG8gcmV0dXJuZWQgYnkgY3JlYXRlIG1ldGhvZFxuICAgICAqIEBzZWUge0BsaW5rIE1lbWVudG9DcmVhdG9yLmNyZWF0ZX1cbiAgICAgKi9cbiAgICByZXN0b3JlKG9yaWdpbmF0b3IsIG1lbWVudG8pIHtcbiAgICAgICAgdGhpcy5fcmVzdG9yZVByaW1pdGl2ZXMob3JpZ2luYXRvciwgbWVtZW50byk7XG5cbiAgICAgICAgdGhpcy5fcmVzdG9yZVJlZnMob3JpZ2luYXRvciwgbWVtZW50byk7XG5cbiAgICAgICAgdGhpcy5fcmVzdG9yZUN1c3RvbShvcmlnaW5hdG9yLCBtZW1lbnRvKTtcblxuICAgICAgICB0aGlzLl9yZXN0b3JlTmVzdGVkKG9yaWdpbmF0b3IsIG1lbWVudG8pO1xuXG4gICAgICAgIHRoaXMuX3Jlc3RvcmVBcnJheXMob3JpZ2luYXRvciwgbWVtZW50byk7XG4gICAgfVxufVxuIiwiLyoqXG4gVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiBDb3B5cmlnaHQgKGMpIDIwMTUgTWFjaWVqIChwcm94ZWxkKSBVcmJhbmVrXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiBTT0ZUV0FSRS5cbiAqL1xuaW1wb3J0IE1lbWVudG9DcmVhdG9yIGZyb20gJy4vbWVtZW50by1jcmVhdG9yLmVzNic7XG5pbXBvcnQgbG9nIGZyb20gJy4uL3V0aWxzL2xvZ2dlci5lczYnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdGF0ZU1hbmlwdWxhdG9yIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgLy8gTWFpbiBkYXRhIHN0cnVjdHVyZSBvZiBzdGF0ZSBtYW5pcHVsYXRvclxuICAgICAgICAvLyBDb250YWlucyBhbGwgcmVjb3JkZWQgc25hcHNob3RzIG9mIHRoZSBnYW1lIHN0YXRlIChjb25zaXN0aW5nIG9mIG1lbWVudG9zIG9mIHZhcmlvdXMgb2JqZWN0cylcbiAgICAgICAgLy8gU2luZ2xlIGVsZW1lbnQgaGFzIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuICAgICAgICAvLyB7XG4gICAgICAgIC8vICAgICB0aW1lc3RhbXA6IC4uLiwgICAgICAgICAgLy8gdGltZXN0YW1wIG9mIGNyZWF0aW5nIHRoZSBtZW1lbnRvc1xuICAgICAgICAvLyAgICAgbWVtZW50b3M6IFtcbiAgICAgICAgLy8gICAgICAgICAge1xuICAgICAgICAvLyAgICAgICAgICAgICAgbWVtb3JhYmxlOiAuLi4sIC8vIHJlZmVyZW5jZSB0byBtZW1vcmFibGUgb2JqZWN0IHRoYXQgd2FzIHVzZWQgdG8gY3JlYXRlIG1lbWVudG9cbiAgICAgICAgLy8gICAgICAgICAgICAgIGRhdGE6IC4uLlxuICAgICAgICAvLyAgICAgICAgICB9LFxuICAgICAgICAvLyAgICAgICAgICAuLi5cbiAgICAgICAgLy8gICAgIF0gICAgIC8vIG1lbWVudG9zIChhcnJheSBvZiBtZW1lbnRvcylcbiAgICAgICAgLy8gfVxuICAgICAgICB0aGlzLl9zbmFwc2hvdHMgPSBbXTtcblxuICAgICAgICAvLyBJbmRleCBvZiB0aGUgY3VycmVudCBzdGF0ZS4gTW9zdCBvZiB0aGUgdGltZSBpdCBpcyBlcXVhbCB0byBfc25hcHNob3RzIGFycmF5IGxlbmd0aFxuICAgICAgICAvLyBTdGF0ZSBzdGFjayBjYW4gYmUgdHJhdmVyc2VkLiBUaGlzIHZhcmlhYmxlIHdpbGwgYmUgdXBkYXRlZCBkdXJpbmcgdHJhdmVyc2FsXG4gICAgICAgIHRoaXMuX2N1cnJlbnRTdGF0ZUluZGV4ID0gLTE7XG5cbiAgICAgICAgLy8gb2JqZWN0ID0+IG1lbWVudG9DcmVhdG9yXG4gICAgICAgIHRoaXMuX21lbW9yYWJsZXMgPSBuZXcgTWFwKCk7XG5cbiAgICAgICAgLy8gY2xhc3MgPT4gbWVtZW50b0NyZWF0b3JcbiAgICAgICAgdGhpcy5fY3JlYXRvcnMgPSBuZXcgTWFwKCk7XG5cbiAgICAgICAgLy8gY2FjaGVkIHZhbHVlIG9mIG1lbW9yeSBmb290cHJpbnQgKHNpemUgb2YgYWxsIHNuYXBzaG90cylcbiAgICAgICAgLy8gcmVzZXR0aW5nIHZhbHVlIHRvICd1bmRlZmluZWQnIHdpbGwgcmVzdWx0IGluIGNhbGN1bGF0aW5nIG1lbW9yeSBmb290cHJpbnQgd2l0aG91dCBjb25zaWRlcmluZyBjYWNoZWQgdmFsdWVcbiAgICAgICAgLy8gdGhpcyBpcyB1c2VkIGZvciBvcHRpbWl6YXRpb25cbiAgICAgICAgdGhpcy5fbWVtb3J5Rm9vdHByaW50Q2FjaGVkID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJlZ2lucyBuZXcgc3RhdGUgcHVzaGluZyBuZXcgb2JqZWN0IG9uIHRoZSBzdGF0ZSBzdGFjayBhbmRcbiAgICAgKiByZW1lbWJlcmluZyB0aW1lc3RhbXAgb2Ygc3RhdGUgKGEuay5hIHRpbWUgb2YgYmVnaW5uaW5nIG9mIGl0J3MgY3JlYXRpb24pXG4gICAgICogTk9URTogVGhpcyBtZXRob2QgaXMgdXNlZCBpbnRlcm5hbGx5LiBZb3Ugc2hvdWxkIG5ldmVyIHVzZSBpdCBieSB5b3Vyc2VsZi5cbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IG5ld2x5IGNyZWF0ZWQgc3RhdGVcbiAgICAgKi9cbiAgICBfaW5pdE5ld1NuYXBzaG90KCkge1xuICAgICAgICB0aGlzLl9zbmFwc2hvdHNbKyt0aGlzLl9jdXJyZW50U3RhdGVJbmRleF0gPSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBvbGQgbWV0aG9kOiB0aW1lTWFuYWdlci50aW1lRWxhcHNlZCgpLFxuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgaWYgZ2FtZS50aW1lLnRpbWUgaXNuJ3QgbW9yZSBhcHByb3ByaWF0ZSBpbiBoZXJlXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgbWVtZW50b3M6IFtdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB0aGlzLmdldExhc3RTbmFwc2hvdCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsZWFycyBzbmFwc2hvdCBzdGFjayAoZGlzY2FyZHMgYWxsIHJlbWVtYmVyZWQgc25hcHNob3RzKSBhbmQgc2V0cyBjdXJyZW50IGluZGV4IHRvIHByb3BlciB2YWx1ZS5cbiAgICAgKiBSZXNldHMgY2FjaGVcbiAgICAgKi9cbiAgICBkaXNjYXJkQWxsU25hcHNob3RzKCkge1xuICAgICAgICB0aGlzLl9zbmFwc2hvdHMgPSBbXTtcbiAgICAgICAgdGhpcy5fY3VycmVudFN0YXRlSW5kZXggPSAtMTtcbiAgICAgICAgdGhpcy5fbWVtb3J5Rm9vdHByaW50Q2FjaGVkID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERpc2NhcmQgYWxsIHRha2VuIHNuYXBzaG90cyB0aGF0IHJlcHJlc2VudCB0aGUgZnV0dXJlLlxuICAgICAqIEl0IG1lYW5zIHRoYXQgd2UgcmVzdG9yZWQgc25hcHNob3QgZnJvbSB0aGUgcGFzdCBhbmQgd2UgZG8gbm90IHdhbnQgdG9cbiAgICAgKiBiZSBhYmxlIHRvIHN0b3JlIGFsbCBzbmFwc2hvdHMgdGFrZW4gYWZ0ZXIgdGhlIHNuYXBzaG90IHdlIHJldmVydGVkIHRvXG4gICAgICogUmVzZXRzIGNhY2hlXG4gICAgICovXG4gICAgZGlzY2FyZEZ1dHVyZVNuYXBzaG90cygpIHtcbiAgICAgICAgdGhpcy5fc25hcHNob3RzLnNwbGljZSh0aGlzLl9jdXJyZW50U3RhdGVJbmRleCArIDEpO1xuICAgICAgICB0aGlzLl9tZW1vcnlGb290cHJpbnRDYWNoZWQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnkgcmVnaXN0ZXJpbmcgb2JqZWN0IGl0IGJlY29tZXMgc3ViamVjdCBvZiBtZW1lbnRvIGNyZWF0aW9uIHRocm91Z2ggI3Rha2VTbmFwc2hvdCgpIG1ldGhvZFxuICAgICAqIEBwYXJhbSBtZW1vcmFibGUgYW55IEphdmFTY3JpcHQgb2JqZWN0XG4gICAgICogQHBhcmFtIGNyZWF0b3IgY3JlYXRvciB3aGljaCB3aWxsIGNyZWF0ZSBtZW1lbnRvIG9mIG1lbW9yYWJsZSBzcGVjaWZpZWQgYXMgZmlyc3QgYXJndW1lbnQuIFRoaXMgcGFyYW0gaXMgbm90XG4gICAgICogYWx3YXlzIG1hbmRhdG9yeS4gSWYgdW5kZWZpbmVkLCBTdGF0ZU1hbmlwdWxhdG9yIHdpbGwgdHJ5IHRvIGZpbmQgY3JlYXRvciB3aGljaCBtYXRjaGVzXG4gICAgICogbWVtb3JhYmxlJ3MgY29uc3RydWN0aW9uIGZ1bmN0aW9uIChjbGFzcykuIFRoaXMgaXMgZG9uZSBieSBjYWNoaW5nIGNyZWF0b3JzIGZvciBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgb2JqZWN0cy5cbiAgICAgKiBAdGhyb3dzIEVycm9yIGlmIGNyZWF0b3Igd2FzIG5vdCBzcGVjaWZpZWQgYW5kIGNhbm5vdCBiZSBmb3VuZCBpbiBjYWNoZVxuICAgICAqIEBzZWUgUGhhc2VyUmV2ZXJzZS5DcmVhdG9ycyBmb3IgcHJlZGVmaW5lZCBjcmVhdG9ycyBmb3IgUGhhc2VyIGJ1aWx0LWluIG9iamVjdHNcbiAgICAgKiBUT0RPOiBjb25zaWRlciBwcmV2ZW50aW9uIG9mIHJlZ2lzdHJhdGlvbiB0aGUgc2FtZSBvYmplY3QgbXVsdGlwbGUgdGltZXNcbiAgICAgKi9cbiAgICByZWdpc3Rlck1lbW9yYWJsZShtZW1vcmFibGUsIGNyZWF0b3IpIHtcbiAgICAgICAgLy8gY2hlY2sgaWYgY3JlYXRvciB3YXMgc3BlY2lmaWVkIGV4cGxpY2l0bHlcbiAgICAgICAgaWYgKGNyZWF0b3IgaW5zdGFuY2VvZiBNZW1lbnRvQ3JlYXRvcikge1xuICAgICAgICAgICAgdGhpcy5fbWVtb3JhYmxlcy5zZXQobWVtb3JhYmxlLCBjcmVhdG9yKTtcblxuICAgICAgICAgICAgLy8gY2FjaGUgY3JlYXRvciBmb3IgbGF0dGVyIHVzYWdlIHdpdGggdGhlIHNhbWUgY2xhc3Mgb2YgbWVtb3JhYmxlIG9iamVjdFxuICAgICAgICAgICAgdGhpcy5fY3JlYXRvcnMuc2V0KG1lbW9yYWJsZS5jb25zdHJ1Y3RvciwgY3JlYXRvcik7XG4gICAgICAgIH0gZWxzZSBpZiAoY3JlYXRvciA9PT0gdW5kZWZpbmVkKSB7ICAvLyBpZiBub3QsIHRyeSB0byBmaW5kIGNyZWF0b3IgYXNzb2NpYXRlZCB3aXRoIG1lbW9yYWJsZSBjbGFzc1xuICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgW2NvbnN0cnVjdG9yLCBjYWNoZWRDcmVhdG9yXSBvZiB0aGlzLl9jcmVhdG9ycy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBjYWNoZSBvZiBjcmVhdG9ycyAtIHNlYXJjaCBmb3IgY3JlYXRvciB0aGF0IG1hdGNoZXMgbWVtb3JhYmxlIGNsYXNzXG4gICAgICAgICAgICAgICAgaWYgKG1lbW9yYWJsZSBpbnN0YW5jZW9mIGNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21lbW9yYWJsZXMuc2V0KG1lbW9yYWJsZSwgY2FjaGVkQ3JlYXRvcik7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDcmVhdG9yIG5vdCBzcGVjaWZpZWQgYW5kIG5vdCBmb3VuZCBpbiBjYWNoZS4gUGxlYXNlIHNwZWNpZnkgYSBjcmVhdG9yIGV4cGxpY2l0bHkuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIG5vdCB2YWxpZCBjcmVhdG9yIGFuZCBub3QgdW5kZWZpbmVkXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NwZWNpZmllZCBjcmVhdG9yIGlzIG5vdCBpbnN0YW5jZSBvZiBNZW1lbnRvQ3JlYXRvciBjbGFzcy4gQ3JlYXRvcjonLCBjcmVhdG9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgbWVtZW50b3Mgb2YgdGhlIGdhbWUgKHJlZ2lzdGVyZWQgb2JqZWN0cylcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGluIGV2ZXJ5IGZyYW1lIGFmdGVyIGFsbCB1cGRhdGUgbG9naWMgaGFzIGJlZW4gZG9uZVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gc25hcHNob3Qgb2YgYWxsIG1lbW9yYWJsZXNcbiAgICAgKi9cbiAgICB0YWtlU25hcHNob3QoKSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgbmV3IHNuYXBzaG90XG4gICAgICAgIGNvbnN0IHNuYXBzaG90ID0gdGhpcy5faW5pdE5ld1NuYXBzaG90KCk7XG5cbiAgICAgICAgLy8gVE9ETzogc2F2ZSBtZW1lbnRvIG9mIHR3ZWVuIG1hbmFnZXIgLSBpdCBpcyBpbXBvcnRhbnQgZm9yIGNvcnJlY3QgdHdlZW4tcmV2ZXJzZSBoYW5kbGluZ1xuICAgICAgICAvLyBzdGF0ZS5tZW1lbnRvcy5wdXNoKHtcbiAgICAgICAgLy8gICAgIG9yaWdpbmF0b3I6IGdhbWUudHdlZW5zLFxuICAgICAgICAvLyAgICAgbWVtZW50bzogZ2FtZS50d2VlbnMuY3JlYXRlTWVtZW50bygpXG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBtZW1lbnRvcyBmb3IgYWxsIG1lbW9yYWJsZXNcbiAgICAgICAgZm9yIChjb25zdCBbbWVtb3JhYmxlLCBjcmVhdG9yXSBvZiB0aGlzLl9tZW1vcmFibGVzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgc25hcHNob3QubWVtZW50b3MucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVtb3JhYmxlLFxuICAgICAgICAgICAgICAgIGRhdGE6IGNyZWF0b3IuY3JlYXRlKG1lbW9yYWJsZSksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCB2YWx1ZSBvZiBzaXplIG9mIGN1cnJlbnRseSB0YWtlbiBzbmFwc2hvdFxuICAgICAgICB0aGlzLl9tZW1vcnlGb290cHJpbnRDYWNoZWQgKz0gdGhpcy5yb3VnaFNuYXBzaG90U2l6ZShzbmFwc2hvdCk7XG5cbiAgICAgICAgcmV0dXJuIHNuYXBzaG90O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc3RvcmVzIHN0YXRlIGZyb20gc25hcHNob3QgdGFrZW4gYnkgI3Rha2VTbmFwc2hvdCgpIG1ldGhvZFxuICAgICAqIEBwYXJhbSBzbmFwc2hvdCBzbmFwc2hvdCBjcmVhdGVkIGJ5ICN0YWtlU25hcHNob3RNZXRob2RcbiAgICAgKiBAc2VlIHRha2VTbmFwc2hvdFxuICAgICAqL1xuICAgIHJlc3RvcmVTbmFwc2hvdChzbmFwc2hvdCkge1xuICAgICAgICAvLyByZXN0b3JlIG1lbWVudG9zIG9mIGFsbCBtZW1vcmFibGVzXG4gICAgICAgIC8vIE5PVEU6IEFsbCB0aGUgX21lbW9yYWJsZXMgYXJlIHN0aWxsIGluIHRoZSBtZW1vcnkgZXZlbiBpZiB1c2VyIG9mIHRoaXMgbGlicmFyeSBkZXN0cm95ZWQgdGhlbSBpbiB0aGUgZ2FtZS5cbiAgICAgICAgLy8gICAgICAgVGhpcyBjYW4gbGVhZCB0byBtZW1vcnkgbGVha3MuXG4gICAgICAgIGNvbnN0IHNuYXBzaG90TnVtYmVyID0gdGhpcy5fc25hcHNob3RzLmluZGV4T2Yoc25hcHNob3QpO1xuXG4gICAgICAgIGlmIChzbmFwc2hvdE51bWJlciA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU25hcHNob3Qgbm90IGZvdW5kIGluIHNuYXBzaG90cyBhcnJheS4gSXMgaXQgYSB2YWxpZCBzbmFwc2hvdD8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgbWVtZW50byBvZiBzbmFwc2hvdC5tZW1lbnRvcykge1xuICAgICAgICAgICAgY29uc3QgY3JlYXRvciA9IHRoaXMuX21lbW9yYWJsZXMuZ2V0KG1lbWVudG8ubWVtb3JhYmxlKTtcbiAgICAgICAgICAgIGNyZWF0b3IucmVzdG9yZShtZW1lbnRvLm1lbW9yYWJsZSwgbWVtZW50by5kYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlYXNzaWduIGN1cnJlbnQgc3RhdGUgaW5kZXhcbiAgICAgICAgdGhpcy5fY3VycmVudFN0YXRlSW5kZXggPSBzbmFwc2hvdE51bWJlcjtcblxuICAgICAgICByZXR1cm4gc25hcHNob3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlcyBjdXJyZW50IHN0YXRlIG9uIHN0YXRlIHNpdHVhdGVkIG4gc3RlcHMgZnJvbSBjdXJyZW50IHN0YXRlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0ZXAgY2FuIGJlIHBvc2l0aXZlIChnb2luZyBmb3J3YXJkKSBvciBuZWdhdGl2ZSAoZ29pbmcgYmFja3dhcmQpXG4gICAgICovXG4gICAgc2hpZnQoc3RlcCA9IC0xKSB7XG4gICAgICAgIGlmICh0aGlzLl9zbmFwc2hvdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBsb2cudHJhY2UoJ05vIHNuYXBzaG90cyB0YWtlbiEgU3RhdGUgd2lsbCBub3QgYmUgY2hhbmdlLicpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZXZpb3VzU3RhdGVJbmRleCA9IHRoaXMuX2N1cnJlbnRTdGF0ZUluZGV4O1xuICAgICAgICBsZXQgdGFyZ2V0U3RhdGVJbmRleCA9IHRoaXMuX2N1cnJlbnRTdGF0ZUluZGV4O1xuICAgICAgICBsZXQgdGFyZ2V0U25hcHNob3Q7XG4gICAgICAgIGxldCBzdGF0ZXNQYXRoO1xuXG4gICAgICAgIGlmIChzdGVwID4gMCkge1xuICAgICAgICAgICAgdGFyZ2V0U3RhdGVJbmRleCA9IE1hdGgubWluKHByZXZpb3VzU3RhdGVJbmRleCArIHN0ZXAsIHRoaXMuX3NuYXBzaG90cy5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIHN0YXRlc1BhdGggPSB0aGlzLl9zbmFwc2hvdHMuc2xpY2UocHJldmlvdXNTdGF0ZUluZGV4ICsgMSwgdGFyZ2V0U3RhdGVJbmRleCArIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0ZXAgPCAwKSB7XG4gICAgICAgICAgICB0YXJnZXRTdGF0ZUluZGV4ID0gTWF0aC5tYXgocHJldmlvdXNTdGF0ZUluZGV4ICsgc3RlcCwgMCk7XG4gICAgICAgICAgICBzdGF0ZXNQYXRoID0gdGhpcy5fc25hcHNob3RzLnNsaWNlKHRhcmdldFN0YXRlSW5kZXgsIHByZXZpb3VzU3RhdGVJbmRleCkucmV2ZXJzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGltZSBzdG9wcGVkLiBUaHJlZSB1c2UtY2FzZXM6XG4gICAgICAgIC8vIC0gc3RlcCBwYXJhbWV0ZXIgaXMgZXF1YWwgMFxuICAgICAgICAvLyAtIHNoaWZ0aW5nIGZvcndhcmQgYW5kIGFscmVhZHkgYXQgdGhlIGVuZCBvZiBzbmFwc2hvdHNcbiAgICAgICAgLy8gLSBzaGlmdGluZyBiYWNrd2FyZCBhbmQgYWxyZWFkeSBhdCB0aGUgYmVnZ2luZyBvZiBzbmFwc2hvdHNcbiAgICAgICAgaWYgKHRhcmdldFN0YXRlSW5kZXggPT09IHByZXZpb3VzU3RhdGVJbmRleCkge1xuICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QgPSB0aGlzLmdldEN1cnJlbnRTbmFwc2hvdCgpO1xuICAgICAgICAgICAgdGhpcy5yZXN0b3JlU25hcHNob3QodGFyZ2V0U25hcHNob3QpO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiByZWNhbGlicmF0ZSB0aW1lclxuICAgICAgICAgICAgLy8gdGltZU1hbmFnZXIuc2V0VGltZSh0YXJnZXRTdGF0ZS50aW1lc3RhbXApO1xuICAgICAgICAgICAgLy8gaWYgKCF0aW1lU3RvcHBlZERpc3BhdGNoZWQpIHtcbiAgICAgICAgICAgIC8vICAgICB0aW1lTWFuYWdlci5vblRpbWVTdG9wcGVkLmRpc3BhdGNoKCk7XG4gICAgICAgICAgICAvLyAgICAgaWYgKGN1cnJlbnRTdGF0ZUlkeCA9PSBzdGF0ZVN0YWNrLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgdGltZU1hbmFnZXIub25UaW1lU3RvcHBlZE1vdmluZ0ZvcndhcmQuZGlzcGF0Y2goKTtcbiAgICAgICAgICAgIC8vICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdGF0ZUlkeCA9PSAwKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHRpbWVNYW5hZ2VyLm9uVGltZVN0b3BwZWRNb3ZpbmdCYWNrd2FyZC5kaXNwYXRjaCgpO1xuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvLyB0aW1lU3RvcHBlZERpc3BhdGNoZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBjdXJyZW50U3RhdGVJbmRleCBkaWRuJ3QgY2hhbmdlIC0gbm8gbmVlZCB0byB1cGRhdGVcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRTbmFwc2hvdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRpbWVTdG9wcGVkRGlzcGF0Y2hlZCA9IGZhbHNlO1xuXG5cbiAgICAgICAgLy8gcmVzdG9yZSBhbGwgc3RhdGVzIHNlcXVlbnRpYWxseVxuICAgICAgICAvLyB0aGlzIGlzIG5lY2Vzc2FyeSBpZiBtZW1lbnRvcyBhcmUgbWluaWZpZWRcbiAgICAgICAgZm9yIChjb25zdCBzbmFwc2hvdCBvZiBzdGF0ZXNQYXRoKSB7XG4gICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCA9IHRoaXMucmVzdG9yZVNuYXBzaG90KHNuYXBzaG90KTtcbiAgICAgICAgICAgIC8vIFRPRE86IHJlY2FsaWJyYXRlIHRpbWVyXG4gICAgICAgICAgICAvLyB0aW1lTWFuYWdlci5zZXRUaW1lKHRhcmdldFN0YXRlLnRpbWVzdGFtcCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1cGRhdGUgY3VycmVudCBzdGF0ZSBpbmRleFxuICAgICAgICB0aGlzLl9jdXJyZW50U3RhdGVJbmRleCA9IHRhcmdldFN0YXRlSW5kZXg7XG5cbiAgICAgICAgcmV0dXJuIHRhcmdldFNuYXBzaG90O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgcm91Z2ggc2l6ZSBvZiBtZW1vcnkgdXNhZ2UgYnkgYWxsIHNuYXBzaG90c1xuICAgICAqIEBwYXJhbSBmb3JjZVJlY2FsY3VsYXRlIGZvcmNlIHN0YXRlIG1hbmlwdWxhdG9yIHRvIHJlY2FsY3VsYXRlIChwcmV2ZW50IGZyb20gdXNpbmcgY2FjaGVkIHZhbHVlKVxuICAgICAqIEByZXR1cm4ge251bWJlcn1cbiAgICAgKi9cbiAgICByb3VnaE1lbW9yeUZvb3RwcmludChmb3JjZVJlY2FsY3VsYXRlID0gZmFsc2UpIHtcbiAgICAgICAgbGV0IHNpemUgPSB0aGlzLl9tZW1vcnlGb290cHJpbnRDYWNoZWQgfHwgMDtcblxuICAgICAgICAvLyByZWZyZXNoIGFsbCBjYWxjdWxhdGlvbnNcbiAgICAgICAgaWYgKHNpemUgPT09IDAgfHwgZm9yY2VSZWNhbGN1bGF0ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBzbmFwc2hvdCBvZiB0aGlzLl9zbmFwc2hvdHMpIHtcbiAgICAgICAgICAgICAgICBzaXplICs9IHRoaXMucm91Z2hTbmFwc2hvdFNpemUoc25hcHNob3QpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjYWNoZSBmb3IgZnV0dXJlXG4gICAgICAgICAgICB0aGlzLl9tZW1vcnlGb290cHJpbnRDYWNoZWQgPSBzaXplO1xuICAgICAgICAgICAgbG9nLmluZm8oJ1JlY2FsY3VsYXRpbmcgbWVtb3J5IGZvb3RwcmludDonLCBzaXplKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgcm91Z2ggc2l6ZSBvZiBtZW1vcnkgdGhhdCBpcyB1c2VkIGJ5IGdpdmVuIHNuYXBzaG90XG4gICAgICogSXQgaXMgYSBzdW0gb2Ygc2l6ZXMgb2YgYWxsIG1lbWVudG9zXG4gICAgICogQHBhcmFtIHNuYXBzaG90XG4gICAgICogQHJldHVybiB7bnVtYmVyfVxuICAgICAqL1xuICAgIHJvdWdoU25hcHNob3RTaXplKHNuYXBzaG90KSB7XG4gICAgICAgIGxldCBzaXplID0gMDtcblxuICAgICAgICBmb3IgKGNvbnN0IG1lbWVudG8gb2Ygc25hcHNob3QubWVtZW50b3MpIHtcbiAgICAgICAgICAgIHNpemUgKz0gdGhpcy5yb3VnaE1lbWVudG9TaXplKG1lbWVudG8pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyByb3VnaCBzaXplIG9mIG1lbW9yeSB0aGF0IGlzIHVzZWQgYnkgbWVtZW50b1xuICAgICAqIEBwYXJhbSBtZW1lbnRvXG4gICAgICogQHJldHVybiB7bnVtYmVyfVxuICAgICAqL1xuICAgIHJvdWdoTWVtZW50b1NpemUobWVtZW50bykge1xuICAgICAgICBpZiAodGhpcy5fbWVtb3JhYmxlcy5oYXMobWVtZW50by5tZW1vcmFibGUpKSB7XG4gICAgICAgICAgICBjb25zdCBjcmVhdG9yID0gdGhpcy5fbWVtb3JhYmxlcy5nZXQobWVtZW50by5tZW1vcmFibGUpO1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0b3IuX2NhbGN1bGF0ZU1lbWVudG9TaXplKG1lbWVudG8uZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01lbW9yYWJsZSBvYmplY3QgZnJvbSBtZW1lbnRvIGhhcyBubyBhc3NvY2lhdGVkIGNyZWF0b3IuIENyZWF0b3I6JywgbWVtZW50byk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBsYXN0IHN0YXRlIGZyb20gdGhlIHN0YXRlIHN0YWNrLiBUaGF0IGlzIHRoZSBsYXN0IHNuYXBzaG90IHRoYXQgd2FzIHRha2VuIGJ5IHRha2VTbmFwc2hvdCBtZXRob2RcbiAgICAgKiBOT1RFOiBsYXN0IHN0YXRlIGlzIG5vdCBhbHdheXMgZXF1YWwgdG8gY3VycmVudCBzdGF0ZS4gTGFzdCBtZWFucyBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldExhc3RTbmFwc2hvdCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3NuYXBzaG90cy5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICBsb2cudHJhY2UoJ1N0YWNrIG9mIHN0YXRlcyBpcyBlbXB0eS4gQ2Fubm90IHJldHVybiBsYXN0IHN0YXRlLicpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLl9zbmFwc2hvdHNbdGhpcy5fc25hcHNob3RzLmxlbmd0aCAtIDFdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgc25hcHNob3QgdGhhdCB3YXMgZWl0aGVyOlxuICAgICAqIC0gbW9zdCByZWNlbnRseSByZXN0b3JlZCBieSBzb21lIG9mIHRoZSBzdGF0ZSBtYW5pcHVsYXRvciBtZXRob2RzIChzaGlmdClcbiAgICAgKiAtIG9yIGxhc3QgdGFrZW4gc25hcHNob3QgYnkgdGFrZVNuYXBzaG90IG1ldGhvZFxuICAgICAqIFdoaWNoZXZlciB3YXMgbW9yZSByZWNlbnRcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBnZXRDdXJyZW50U25hcHNob3QoKSB7XG4gICAgICAgIGlmICh0aGlzLl9zbmFwc2hvdHMubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgbG9nLnRyYWNlKCdTdGFjayBvZiBzdGF0ZXMgaXMgZW1wdHkuIENhbm5vdCByZXR1cm4gbGFzdCBzdGF0ZS4nKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5fc25hcHNob3RzW3RoaXMuX2N1cnJlbnRTdGF0ZUluZGV4XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXJyZW50IHN0YXRlIG51bWJlciBnZXR0ZXIsXG4gICAgICogQHNlZSBnZXRDdXJyZW50U25hcHNob3QgZm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCAnY3VycmVudCcgbWVhbnNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBnZXRDdXJyZW50U25hcHNob3ROdW1iZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50U3RhdGVJbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFtb3VudCBvZiBjdXJyZW50bHkgc3RvcmVkIHNuYXBzaG90c1xuICAgICAqIEByZXR1cm4ge051bWJlcn0gYW1vdW50IG9mIGN1cnJlbnRseSBzdG9yZWQgc25hcHNob3RzXG4gICAgICovXG4gICAgZ2V0U25hcHNob3RzQW1vdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc25hcHNob3RzLmxlbmd0aDtcbiAgICB9XG5cbn1cbiIsIi8qKlxuIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gQ29weXJpZ2h0IChjKSAyMDE1IE1hY2llaiAocHJveGVsZCkgVXJiYW5la1xuXG4gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG4gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gU09GVFdBUkUuXG4gKi9cblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgb2JqZWN0IChwb3NzaWJseSBuZXN0ZWQpIHByb3BlcnR5LlxuICAgICAqIFRha2VzIGludG8gYWNjb3VudCBwcm90b3R5cGUgY2hhaW5cbiAgICAgKiBAcGFyYW0gb2JqIG9iamVjdCBmcm9tIHdoaWNoIHByb3BlcnR5IGlzIHRha2VuXG4gICAgICogQHBhcmFtIGRvdHRlZFN0cmluZyBzaW1wbGUgcHJvcGVydHkgbmFtZSBvciBkb3R0ZWQgbmFtZSBmb3IgbmVzdGVkIHByb3BlcnRpZXNcbiAgICAgKiAoZS5nICdwb3NpdGlvbi54JyBpZiB5b3Ugd2FudCB0byBnZXQgeCBwcm9wZXJ0eSBmcm9tIHBvc2l0aW9uIHByb3BlcnR5IG9uIEBwYXJhbSBvYmopXG4gICAgICogQHBhcmFtIGZhbGxiYWNrVmFsdWUgaWYgcHJvcGVydHkgaXMgZXF1YWwgdG8gdW5kZWZpbmVkIGZhbGxiYWNrVmFsdWUgd2lsbCBiZSByZXR1cm5lZFxuICAgICAqIChpZiBub3Qgc3BlY2lmaWVkIHVuZGVmaW5lZCB3aWxsIGJlIHJldHVybmVkKVxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgZ2V0UHJvcGVydHkob2JqLCBkb3R0ZWRTdHJpbmcgPSAnJywgZmFsbGJhY2tWYWx1ZSkge1xuICAgICAgICBjb25zdCBwcm9wcyA9IGRvdHRlZFN0cmluZy5zcGxpdCgnLicpO1xuICAgICAgICBsZXQgZmluYWwgPSBvYmo7XG5cbiAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIHByb3BzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGZpbmFsID09PSAnb2JqZWN0JyAmJiBwYXJ0IGluIGZpbmFsKSB7XG4gICAgICAgICAgICAgICAgZmluYWwgPSBmaW5hbFtwYXJ0XTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbGxiYWNrVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmluYWw7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBTZXRzIHByb3BlcnR5IG9mIGFuIG9iamVjdCAocG9zc2libHkgbmVzdGVkKS5cbiAgICAgKiBJZiBvbiB0aGUgd2F5IHRvIHNldCBmaW5hbCB2YWx1ZSBwcm9wZXJ0aWVzIGFyZSBtaXNzaW5nLCB0aGV5IGFyZSBiZWluZyBjcmVhdGVkXG4gICAgICogQHBhcmFtIG9iaiBvYmplY3Qgb24gd2hpY2ggcHJvcGVydHkgaXMgc2V0XG4gICAgICogQHBhcmFtIGRvdHRlZFN0cmluZyBzaW1wbGUgcHJvcGVydHkgbmFtZSBvciBkb3R0ZWQgbmFtZSBmb3IgbmVzdGVkIHByb3BlcnRpZXNcbiAgICAgKiAoZS5nICdwb3NpdGlvbi54JyBpZiB5b3Ugd2FudCB0byBnZXQgeCBwcm9wZXJ0eSBmcm9tIHBvc2l0aW9uIHByb3BlcnR5IG9uIEBwYXJhbSBvYmopXG4gICAgICogQHBhcmFtIHZhbHVlIHZhbHVlIG9mIHRoZSBwcm9wZXJ0eSB0aGF0IGlzIGJlaW5nIHNldFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgc2V0UHJvcGVydHkob2JqLCBkb3R0ZWRTdHJpbmcsIHZhbHVlKSB7XG4gICAgICAgIGlmIChkb3R0ZWRTdHJpbmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByb3BzID0gZG90dGVkU3RyaW5nLnNwbGl0KCcuJyk7XG4gICAgICAgIGNvbnN0IGxhc3RQcm9wID0gcHJvcHMucG9wKCk7XG4gICAgICAgIGxldCB0ZW1wID0gb2JqO1xuXG4gICAgICAgIGZvciAoY29uc3QgcGFydCBvZiBwcm9wcykge1xuICAgICAgICAgICAgaWYgKHRlbXAuaGFzT3duUHJvcGVydHkocGFydCkpIHtcbiAgICAgICAgICAgICAgICB0ZW1wID0gdGVtcFtwYXJ0XTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGVtcFtwYXJ0XSA9IHt9O1xuICAgICAgICAgICAgICAgIHRlbXAgPSB0ZW1wW3BhcnRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGVtcFtsYXN0UHJvcF0gPSB2YWx1ZTtcblxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHByb3BlcnR5IChwb3NzaWJseSBuZXN0ZWQpIGV4aXN0cyBpbiBvYmplY3RcbiAgICAgKiBUYWtlcyBpbnRvIGFjY291bnQgcHJvdG90eXBlIGNoYWluXG4gICAgICogQHBhcmFtIG9iaiBvYmplY3QgZnJvbSB3aGljaCBwcm9wZXJ0eSBpcyBjaGVja2VkXG4gICAgICogQHBhcmFtIGRvdHRlZFN0cmluZyBzaW1wbGUgcHJvcGVydHkgbmFtZSBvciBkb3R0ZWQgbmFtZSBmb3IgbmVzdGVkIHByb3BlcnRpZXNcbiAgICAgKiAoZS5nICdwb3NpdGlvbi54JyBpZiB5b3Ugd2FudCB0byBnZXQgeCBwcm9wZXJ0eSBmcm9tIHBvc2l0aW9uIHByb3BlcnR5IG9uIEBwYXJhbSBvYmopXG4gICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoYXNQcm9wZXJ0eShvYmosIGRvdHRlZFN0cmluZykge1xuICAgICAgICBjb25zdCBwcm9wcyA9IGRvdHRlZFN0cmluZy5zcGxpdCgnLicpO1xuICAgICAgICBsZXQgZmluYWwgPSBvYmo7XG5cbiAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIHByb3BzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGZpbmFsID09PSAnb2JqZWN0JyAmJiBwYXJ0IGluIGZpbmFsKSB7XG4gICAgICAgICAgICAgICAgZmluYWwgPSBmaW5hbFtwYXJ0XTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICAvLyBUT0RPOiBhZGQgZG9jIHRvIHRoaXMgZnVuY3Rpb24gb3IgcmVwbGFjZSBpdCB3aXRoIGJldHRlciBvbmVcbiAgICAvLyBhbHRlcm5hdGl2ZTogaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2Uvb2JqZWN0LXNpemVvZlxuICAgIHJvdWdoU2l6ZU9mT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAvLyBzb3VyY2U6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTI0ODMwMi9qYXZhc2NyaXB0LW9iamVjdC1zaXplI2Fuc3dlci0xMTkwMDIxOFxuICAgICAgICBjb25zdCBvYmplY3RMaXN0ID0gW107XG4gICAgICAgIGNvbnN0IHN0YWNrID0gW29iamVjdF07XG4gICAgICAgIGxldCBieXRlcyA9IDA7XG5cbiAgICAgICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBzdGFjay5wb3AoKTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgYnl0ZXMgKz0gNDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGJ5dGVzICs9IHZhbHVlLmxlbmd0aCAqIDI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBieXRlcyArPSA4O1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIG9iamVjdExpc3QuaW5kZXhPZih2YWx1ZSkgPT09IC0xICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0TGlzdC5wdXNoKHZhbHVlKTtcblxuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGVuZ3RoIG9mIHRoZSBrZXlcbiAgICAgICAgICAgICAgICAgICAgYnl0ZXMgKz0ga2V5Lmxlbmd0aCAqIDI7XG5cbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZVtrZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ5dGVzO1xuICAgIH0sXG59O1xuIiwiLyoqXG4gVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiBDb3B5cmlnaHQgKGMpIDIwMTUgTWFjaWVqIChwcm94ZWxkKSBVcmJhbmVrXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiBTT0ZUV0FSRS5cbiAqL1xuaW1wb3J0ICcuL2RlYnVnZ2VyLmxlc3MnO1xuXG5jb25zdCB0b29sYmFyTWFya3VwID0gYFxuICAgIDxkaXYgaWQ9XCJzdGF0ZS1zbGlkZXItd3JhcHBlclwiPlxuICAgICAgICA8bGFiZWwgZm9yPVwic3RhdGUtc2xpZGVyXCIgaWQ9XCJzbGlkZXItY3VycmVudC1sYWJlbFwiIGNsYXNzPVwibGFiZWxcIiB0aXRsZT1cIkN1cnJlbnQgc3RhdGVcIj4xPC9sYWJlbD5cbiAgICAgICAgPGxhYmVsIGNsYXNzPVwibGFiZWxcIj4vPC9sYWJlbD5cbiAgICAgICAgPGxhYmVsIGNsYXNzPVwibGFiZWxcIiBpZD1cInNsaWRlci1tYXgtbGFiZWxcIiB0aXRsZT1cIlN0YXRlcyBhbW91bnRcIj4xMDwvbGFiZWw+XG4gICAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiB2YWx1ZT1cIjBcIiBtaW49XCIxXCIgbWF4PVwiMTBcIiBzdGVwPVwiMVwiIGlkPVwic3RhdGUtc2xpZGVyXCIvPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYnRuXCIgaWQ9XCJtYW5pcHVsYXRvci1maXJzdFwiPiYjODY3Njs8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImJ0blwiIGlkPVwibWFuaXB1bGF0b3ItcHJldmlvdXNcIj7ina48L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImJ0blwiIGlkPVwibWFuaXB1bGF0b3ItcGF1c2VcIj4mIzk2NTQ7PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJidG5cIiBpZD1cIm1hbmlwdWxhdG9yLW5leHRcIj7ina88L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImJ0blwiIGlkPVwibWFuaXB1bGF0b3ItbGFzdFwiPiYjODY3Nzs8L2Rpdj5cbiAgICA8L2Rpdj5cbmA7XG5cbmNvbnN0IGRlZmF1bHRzID0ge1xuICAgIHRvb2xiYXI6IHRydWUsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEZWJ1Z2dlciB7XG5cbiAgICBjb25zdHJ1Y3RvcihnYW1lLCBzdGF0ZU1hbmlwdWxhdG9yLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICghZ2FtZSB8fCAhc3RhdGVNYW5pcHVsYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0dhbWUgb3IgU3RhdGVNYW5pcHVsYXRvciBhcmd1bWVudHMgYXJlIG1pc3NpbmcnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmdhbWUgPSBnYW1lO1xuICAgICAgICB0aGlzLnN0YXRlTWFuaXB1bGF0b3IgPSBzdGF0ZU1hbmlwdWxhdG9yO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fbm9kZXMgPSB7XG4gICAgICAgICAgICB0b29sYmFyRGl2OiBudWxsLFxuICAgICAgICAgICAgc2xpZGVyOiBudWxsLFxuICAgICAgICAgICAgY3VycmVudExhYmVsOiBudWxsLFxuICAgICAgICAgICAgbWF4TGFiZWw6IG51bGwsXG4gICAgICAgICAgICBtYW5pcHVsYXRvckZpcnN0OiBudWxsLFxuICAgICAgICAgICAgbWFuaXB1bGF0b3JQcmV2aW91czogbnVsbCxcbiAgICAgICAgICAgIG1hbmlwdWxhdG9yUGF1c2U6IG51bGwsXG4gICAgICAgICAgICBtYW5pcHVsYXRvck5leHQ6IG51bGwsXG4gICAgICAgICAgICBtYW5pcHVsYXRvckxhc3Q6IG51bGwsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gdG9vbGJhciBtb2R1bGVcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy50b29sYmFyKSB7XG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVUb29sYmFyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3QgYWxsIHRoZSBtYXJrdXAgYXNzb2NpYXRlZCB3aXRoIHRvb2xiYXJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmVhdGVUb29sYmFyKCkge1xuICAgICAgICB0aGlzLl9ub2Rlcy50b29sYmFyRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRoaXMuX25vZGVzLnRvb2xiYXJEaXYuaWQgPSAnZGVidWctdG9vbGJhcic7XG4gICAgICAgIHRoaXMuX25vZGVzLnRvb2xiYXJEaXYuaW5uZXJIVE1MID0gdG9vbGJhck1hcmt1cDtcblxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuX25vZGVzLnRvb2xiYXJEaXYpO1xuXG4gICAgICAgIHRoaXMuX2JpbmROb2RlcygpO1xuXG4gICAgICAgIC8vIGF0dGFjaCBldmVudHNcbiAgICAgICAgdGhpcy5fYXR0YWNoRXZlbnRzKCk7XG5cbiAgICAgICAgLy8gc2hvdyB0b29sYmFyXG4gICAgICAgIHRoaXMuc2hvdygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJpbmRzIERPTSBlbGVtZW50cyB3aXRoIEpTIHZhcmlhYmxlc1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2JpbmROb2RlcygpIHtcbiAgICAgICAgdGhpcy5fbm9kZXMuc2xpZGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXRlLXNsaWRlcicpO1xuICAgICAgICB0aGlzLl9ub2Rlcy5tYXhMYWJlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzbGlkZXItbWF4LWxhYmVsJyk7XG4gICAgICAgIHRoaXMuX25vZGVzLmN1cnJlbnRMYWJlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzbGlkZXItY3VycmVudC1sYWJlbCcpO1xuICAgICAgICB0aGlzLl9ub2Rlcy5tYW5pcHVsYXRvckZpcnN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hbmlwdWxhdG9yLWZpcnN0Jyk7XG4gICAgICAgIHRoaXMuX25vZGVzLm1hbmlwdWxhdG9yUHJldmlvdXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFuaXB1bGF0b3ItcHJldmlvdXMnKTtcbiAgICAgICAgdGhpcy5fbm9kZXMubWFuaXB1bGF0b3JQYXVzZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYW5pcHVsYXRvci1wYXVzZScpO1xuICAgICAgICB0aGlzLl9ub2Rlcy5tYW5pcHVsYXRvck5leHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFuaXB1bGF0b3ItbmV4dCcpO1xuICAgICAgICB0aGlzLl9ub2Rlcy5tYW5pcHVsYXRvckxhc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFuaXB1bGF0b3ItbGFzdCcpO1xuICAgIH1cblxuICAgIF9hdHRhY2hFdmVudHMoKSB7XG4gICAgICAgIGNvbnN0IHsgc2xpZGVyLCBtYW5pcHVsYXRvclBhdXNlLCBtYW5pcHVsYXRvckZpcnN0LCBtYW5pcHVsYXRvclByZXZpb3VzLFxuICAgICAgICAgICAgbWFuaXB1bGF0b3JOZXh0LCBtYW5pcHVsYXRvckxhc3QgfSA9IHRoaXMuX25vZGVzO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBsYWJlbCBzaG93aW5nIGN1cnJlbnQgc3RhdGUgYW5kIHBhdXNlIGdhbWVcbiAgICAgICAgLy8gYW5kIHJlc3RvcmUgZ2l2ZW4gc25hcHNob3RcbiAgICAgICAgc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nYW1lLnBhdXNlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9yZXN0b3JlV2l0aExhYmVsVXBkYXRlKHNsaWRlci52YWx1ZSAtIDEpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBwYXVzZS9yZXN1bWUgZ2FtZSBhbmQgZGlzY2FyZCBmdXR1cmUgc3RhdGVzXG4gICAgICAgIG1hbmlwdWxhdG9yUGF1c2UuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmdhbWUucGF1c2VkID0gIXRoaXMuZ2FtZS5wYXVzZWQ7XG4gICAgICAgICAgICB0aGlzLnN0YXRlTWFuaXB1bGF0b3IuZGlzY2FyZEZ1dHVyZVNuYXBzaG90cygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBwYXVzZSBnYW1lIGFuZCByZXN0b3JlIGZpcnN0IGV4aXN0aW5nIHNuYXBzaG90XG4gICAgICAgIG1hbmlwdWxhdG9yRmlyc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmdhbWUucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3Jlc3RvcmVXaXRoTGFiZWxVcGRhdGUoMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHBhdXNlIGdhbWUgYW5kIHJlc3RvcmUgcHJldmlvdXMgc25hcHNob3RcbiAgICAgICAgbWFuaXB1bGF0b3JQcmV2aW91cy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIC8vIHByZXZpb3VzIHNuYXBzaG90IG51bWJlclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0U25hcHNob3ROdW1iZXIgPSBNYXRoLm1heCgwLCBzbGlkZXIudmFsdWUgLSAyKTtcbiAgICAgICAgICAgIHRoaXMuZ2FtZS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fcmVzdG9yZVdpdGhMYWJlbFVwZGF0ZSh0YXJnZXRTbmFwc2hvdE51bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHBhdXNlIGdhbWUgYW5kIHJlc3RvcmUgbmV4dCBzbmFwc2hvdFxuICAgICAgICBtYW5pcHVsYXRvck5leHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBuZXh0IHNuYXBzaG90IG51bWJlclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0U25hcHNob3ROdW1iZXIgPSBNYXRoLm1pbih0aGlzLnN0YXRlTWFuaXB1bGF0b3IuZ2V0U25hcHNob3RzQW1vdW50KCkgLSAxLCBzbGlkZXIudmFsdWUpO1xuICAgICAgICAgICAgdGhpcy5nYW1lLnBhdXNlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9yZXN0b3JlV2l0aExhYmVsVXBkYXRlKHRhcmdldFNuYXBzaG90TnVtYmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcGF1c2UgZ2FtZSBhbmQgcmVzdG9yZSBsYXN0IGV4aXN0aW5nIHNuYXBzaG90XG4gICAgICAgIG1hbmlwdWxhdG9yTGFzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldFNuYXBzaG90TnVtYmVyID0gTWF0aC5taW4odGhpcy5zdGF0ZU1hbmlwdWxhdG9yLmdldFNuYXBzaG90c0Ftb3VudCgpIC0gMSk7XG4gICAgICAgICAgICB0aGlzLmdhbWUucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3Jlc3RvcmVXaXRoTGFiZWxVcGRhdGUodGFyZ2V0U25hcHNob3ROdW1iZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZW5pZW50IGZ1bmN0aW9uIGZvciByZXN0b3JpbmcgY2VydGFpbiBzbmFwc2hvdCBhbmQgdXBkYXRpbmcgdGhlIHNsaWRlciBsYWJlbHNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBudW1iZXIgbnVtYmVyIG9mIHNuYXBzaG90XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVzdG9yZVdpdGhMYWJlbFVwZGF0ZShudW1iZXIpIHtcbiAgICAgICAgY29uc3QgeyBjdXJyZW50TGFiZWwsIHNsaWRlciB9ID0gdGhpcy5fbm9kZXM7XG5cbiAgICAgICAgdGhpcy5zdGF0ZU1hbmlwdWxhdG9yLnJlc3RvcmVTbmFwc2hvdCh0aGlzLnN0YXRlTWFuaXB1bGF0b3IuX3NuYXBzaG90c1tudW1iZXJdKTtcblxuICAgICAgICAvLyBhZGQgb25lIHRvIGhhbmRsZSAwLWluZGV4ZWQgYXJyYXlcbiAgICAgICAgY3VycmVudExhYmVsLmlubmVySFRNTCA9IG51bWJlciArIDE7XG4gICAgICAgIHNsaWRlci52YWx1ZSA9IG51bWJlciArIDE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2hvdyB0b29sYmFyIG9uIHRoZSBzY3JlZW5cbiAgICAgKiBVc2Ugb25seSBpZiB0b29sYmFyIGhhcyBiZWVuIGNyZWF0ZWQgZHVyaW5nIGNvbnN0cnVjdGlvblxuICAgICAqL1xuICAgIHNob3coKSB7XG4gICAgICAgIHRoaXMuX25vZGVzLnRvb2xiYXJEaXYuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGlkZSB0b29sYmFyXG4gICAgICogVXNlIG9ubHkgaWYgdG9vbGJhciBoYXMgYmVlbiBjcmVhdGVkIGR1cmluZyBjb25zdHJ1Y3Rpb25cbiAgICAgKi9cbiAgICBoaWRlKCkge1xuICAgICAgICB0aGlzLl9ub2Rlcy50b29sYmFyRGl2LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyBsYWJlbHMvaW5wdXQgdmFsdWVzXG4gICAgICogU2hvdWxkIGJlIGNhbGxlZCBpbiBnYW1lJ3MgdXBkYXRlIGZ1bmN0aW9uXG4gICAgICovXG4gICAgdXBkYXRlKCkge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnRvb2xiYXIpIHtcbiAgICAgICAgICAgIGNvbnN0IHNuYXBzaG90c0Ftb3VudCA9IHRoaXMuc3RhdGVNYW5pcHVsYXRvci5nZXRTbmFwc2hvdHNBbW91bnQoKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTbmFwc2hvdCA9IHRoaXMuc3RhdGVNYW5pcHVsYXRvci5nZXRDdXJyZW50U25hcHNob3ROdW1iZXIoKTtcbiAgICAgICAgICAgIGNvbnN0IHsgc2xpZGVyLCBtYXhMYWJlbCwgY3VycmVudExhYmVsIH0gPSB0aGlzLl9ub2RlcztcblxuICAgICAgICAgICAgY3VycmVudExhYmVsLmlubmVySFRNTCA9IGN1cnJlbnRTbmFwc2hvdCArIDE7XG4gICAgICAgICAgICBtYXhMYWJlbC5pbm5lckhUTUwgPSBzbGlkZXIubWF4ID0gc2xpZGVyLnZhbHVlID0gc25hcHNob3RzQW1vdW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRHJhdyBkZWJ1ZyBpbmZvcm1hdGlvbiBvbiB0aGUgc2NyZWVuXG4gICAgICogQHBhcmFtIHN0YXRlTWFuaXB1bGF0b3JcbiAgICAgKiBAcGFyYW0geFxuICAgICAqIEBwYXJhbSB5XG4gICAgICogQHBhcmFtIGNvbG9yXG4gICAgICovXG4gICAgc3RhdGVNYW5pcHVsYXRvckluZm8oc3RhdGVNYW5pcHVsYXRvciwgeCA9IDAsIHkgPSAwLCBjb2xvciA9ICcjZmZmZmZmJykge1xuICAgICAgICBpZiAoIXN0YXRlTWFuaXB1bGF0b3IuZ2V0TGFzdFNuYXBzaG90KCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxhc3RTbmFwc2hvdFNpemUgPSBzdGF0ZU1hbmlwdWxhdG9yLnJvdWdoU25hcHNob3RTaXplKHN0YXRlTWFuaXB1bGF0b3IuZ2V0TGFzdFNuYXBzaG90KCkpO1xuICAgICAgICBjb25zdCBGUkFNRV9SQVRFID0gNjA7XG4gICAgICAgIGNvbnN0IE1CUGVyU2Vjb25kID0gKChsYXN0U25hcHNob3RTaXplICogRlJBTUVfUkFURSkgLyAxMDI0KSAvIDEwMjQ7XG4gICAgICAgIGNvbnN0IE1CUGVySG91ciA9IE1CUGVyU2Vjb25kICogNjAgKiA2MDtcbiAgICAgICAgY29uc3QgbWVtb3J5Rm9vdHByaW50ID0gKHN0YXRlTWFuaXB1bGF0b3Iucm91Z2hNZW1vcnlGb290cHJpbnQoKSAvIDEwMjQpIC8gMTAyNDtcblxuICAgICAgICB0aGlzLmdhbWUuZGVidWcuc3RhcnQoeCwgeSwgY29sb3IpO1xuXG4gICAgICAgIHRoaXMuZ2FtZS5kZWJ1Zy5saW5lKGBMYXN0IHNuYXBzaG90IHNpemU6ICR7bGFzdFNuYXBzaG90U2l6ZX0gQnl0ZXNgKTtcbiAgICAgICAgdGhpcy5nYW1lLmRlYnVnLmxpbmUoYE1lbW9yeSBmb290cHJpbnQ6ICR7TUJQZXJTZWNvbmQudG9GaXhlZCg0KX0gTUIvc2ApO1xuICAgICAgICB0aGlzLmdhbWUuZGVidWcubGluZShgTWVtb3J5IGZvb3RwcmludDogJHtNQlBlckhvdXIudG9GaXhlZCgyKX0gTUIvaG91cmApO1xuICAgICAgICB0aGlzLmdhbWUuZGVidWcubGluZShgTWVtb3J5IGZvb3RwcmludDogJHttZW1vcnlGb290cHJpbnQudG9GaXhlZCgyKX0gTUJgKTtcblxuICAgICAgICB0aGlzLmdhbWUuZGVidWcuc3RvcCgpO1xuICAgIH1cbn1cbiIsIihmdW5jdGlvbigpIHsgdmFyIGhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdOyB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpOyBzdHlsZS50eXBlID0gJ3RleHQvY3NzJzt2YXIgY3NzID0gXCIjZGVidWctdG9vbGJhcntwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtiYWNrZ3JvdW5kOiNFRjUzNTA7cGFkZGluZzo4cHggMH0jZGVidWctdG9vbGJhciAjc3RhdGUtc2xpZGVyLXdyYXBwZXJ7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOnJvd30jZGVidWctdG9vbGJhciAjc3RhdGUtc2xpZGVyLXdyYXBwZXI+KnttYXJnaW46M3B4fSNkZWJ1Zy10b29sYmFyICNzdGF0ZS1zbGlkZXItd3JhcHBlciAuYnRue2Rpc3BsYXk6aW5saW5lLWJsb2NrO2JhY2tncm91bmQ6I0ZBRkFGQTtwYWRkaW5nOjNweCA1cHg7Ym94LXNoYWRvdzoxcHggMXB4IDNweCAwIHJnYmEoMCwwLDAsMC40KTtjdXJzb3I6cG9pbnRlcjttaW4td2lkdGg6MzJweDt0ZXh0LWFsaWduOmNlbnRlcn0jZGVidWctdG9vbGJhciAjc3RhdGUtc2xpZGVyLXdyYXBwZXIgLmJ0bjpob3Zlcntib3gtc2hhZG93OjFweCAxcHggOHB4IDAgcmdiYSgwLDAsMCwwLjgpO2JhY2tncm91bmQtY29sb3I6I0VFRUVFRX0jZGVidWctdG9vbGJhciAjc3RhdGUtc2xpZGVyLXdyYXBwZXIgLmxhYmVse2ZvbnQtc2l6ZToxOHB4O2ZvbnQtd2VpZ2h0OmJvbGQ7Y29sb3I6I0ZBRkFGQTt3aWR0aDoyJTt0ZXh0LWFsaWduOmNlbnRlcn0jZGVidWctdG9vbGJhciAjc3RhdGUtc2xpZGVyLXdyYXBwZXIgI3N0YXRlLXNsaWRlcnt3aWR0aDoxMDAlO2N1cnNvcjpwb2ludGVyfVwiO2lmIChzdHlsZS5zdHlsZVNoZWV0KXsgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzOyB9IGVsc2UgeyBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTsgfSBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTt9KCkpIiwiLyoqXG4gVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiBDb3B5cmlnaHQgKGMpIDIwMTUgTWFjaWVqIChwcm94ZWxkKSBVcmJhbmVrXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiBTT0ZUV0FSRS5cbiAqL1xuaW1wb3J0IGxvZyBmcm9tICdsb2dsZXZlbCc7XG5cbmxvZy5zZXREZWZhdWx0TGV2ZWwobG9nLmxldmVscy5UUkFDRSk7XG5cbmV4cG9ydCBkZWZhdWx0IGxvZztcbiIsIi8qKlxuIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gQ29weXJpZ2h0IChjKSAyMDE1IE1hY2llaiAocHJveGVsZCkgVXJiYW5la1xuXG4gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG4gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gU09GVFdBUkUuXG4gKi9cblxuY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgcmFuZ2U6IFstOCwgLTQsIC0yLCAtMSwgMCwgMSwgMiwgNCwgOF0sXG4gICAgcmVzZXRJbmRleDogMyxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE11bHRpcGxpZXIge1xuXG4gICAgY29uc3RydWN0b3IocmFuZ2UgPSBkZWZhdWx0cy5yYW5nZSwgcmVzZXRJbmRleCA9IGRlZmF1bHRzLnJlc2V0SW5kZXgpIHtcbiAgICAgICAgdGhpcy5fcmFuZ2UgPSByYW5nZTtcbiAgICAgICAgdGhpcy5fcmVzZXRJbmRleCA9IE1hdGgubWluKHJlc2V0SW5kZXgsIHRoaXMuX3JhbmdlLmxlbmd0aCAtIDEpO1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRNdWx0aXBsaWVySW5kZXggPSB0aGlzLl9yZXNldEluZGV4O1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50KCk7XG4gICAgfVxuXG4gICAgbmV4dCgpIHtcbiAgICAgICAgdGhpcy5fY3VycmVudE11bHRpcGxpZXJJbmRleCA9IE1hdGgubWluKHRoaXMuX2N1cnJlbnRNdWx0aXBsaWVySW5kZXggKyAxLCB0aGlzLl9yYW5nZS5sZW5ndGggLSAxKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudCgpO1xuICAgIH1cblxuICAgIHByZXZpb3VzKCkge1xuICAgICAgICB0aGlzLl9jdXJyZW50TXVsdGlwbGllckluZGV4ID0gTWF0aC5tYXgodGhpcy5fY3VycmVudE11bHRpcGxpZXJJbmRleCAtIDEsIDApO1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50KCk7XG4gICAgfVxuXG4gICAgY3VycmVudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmdlW3RoaXMuX2N1cnJlbnRNdWx0aXBsaWVySW5kZXhdO1xuICAgIH1cbn1cbiJdfQ==

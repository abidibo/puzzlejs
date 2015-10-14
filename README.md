#Puzzle Js Library

This is a simple javascript library which can generate a puzzle of x rows and y columns of a given image.
The image is divided in a number (x * y) of slots, all of the same size.

##License

This software is distributed under the MIT License, read more at https://opensource.org/licenses/MIT

##Requirements

This library is written in vanilla javascript, so you don't need any js framework

##Getting Started

Include the library

    <script src="path/to/library/puzzle.js" /></script>

Then in the document

    <img id="myImage" src="/path/to/my/image.jpg" />
    <div id="here"></div>
    <script>
        var p = new pz.Puzzle('myImage', { render_to: 'here', rows: 3, cols: 2 });
    </script>

##Usage

    var p = new Puzzle(img_id, options);

### Options

- __hide_original__: whether or not to hide the original image. Default false.
- __render_to__: id of the element in which the canvas should be rendered. If not provided is appended to the body. Default null.
- __rows__: number of puzzle rows. Default 5.
- __cols__: number of puzzle cols. Default 5.
- __margin__: number of px of margin between the canvas border and the puzzle. Default 100.
- __snap_offset__: number of px of the snap functionality. Default 50.
- __snap_color__: hex code of the color of the border when the snap is active. Default '#00ff00'.
- __grid_color__: hex code of the color of the puzzle grid. Default '#0000ff'.
- __slot_color__: hex code of the color of the slot border. Default '#666'.
- __puzzle_completed_text__: text to show when the puzzle is completed after a shuffle, use '%TIME' as a placeholder for the elapsed time. Default 'puzzle completed in %TIME s!'
- __move_after_shuffle__: whether or not allow slot dragging only after a shuffle. Default true.

### Methods

    (void) shuffle()

Shuffles the puzzle slots and activates the timer and "check if completed" feature.



/**
 * @file puzzle.js
 * @author abidibo <abidibo@gmail.com>
 * @copyright 2015 Otto SRL
 * @license MIT
 */
"use strict";

var pz = pz || {};

(function() {

    /**
     * Event Dispatcher
     * Allows objects to register callbacks when some events occurr
     */
    pz.EventDispatcher = {
        _prefix: 'on_',
        listeners: {},
        listeners_only_once: {},
        register: function(evt_name, bind, callback) {
            var _evt_name = this._prefix + evt_name;
            if(typeof this.listeners[_evt_name] == 'undefined') {
                this.listeners[_evt_name] = [];
            }
            this.listeners[_evt_name].push([bind === null ? this : bind, callback]);
        },
        registerOnlyOnce: function(evt_name, bind, callback) {
            var _evt_name = this._prefix + evt_name;
            if(typeof this.listeners_only_once[_evt_name] == 'undefined') {
                this.listeners_only_once[_evt_name] = [];
            }
            this.listeners_only_once[_evt_name].push([bind === null ? this : bind, callback]);
        },
        emit: function(evt_name, params) {
            var _evt_name = this._prefix + evt_name;
            if(typeof this.listeners[_evt_name] != 'undefined') {
                for(var i = 0, l = this.listeners[_evt_name].length; i < l; i++) {
                    this.listeners[_evt_name][i][1].call(this.listeners[_evt_name][i][0], evt_name, params);
                }
            }
            if(typeof this.listeners_only_once[_evt_name] != 'undefined') {
                for(var i = 0, l = this.listeners_only_once[_evt_name].length; i < l; i++) {
                    this.listeners_only_once[_evt_name][i][1].call(this.listeners_only_once[_evt_name][i][0], evt_name, params);
                }
                this.listeners_only_once[_evt_name] = [];
            }
        }
    };

    /**
     * Options singleton object
     */
    pz.Options = {
        move_after_shuffle: true,
        hide_original: false,
        render_to: null,
        rows: 5,
        cols: 5,
        margin: 100,
        snap_offset: 50,
        snap_color: '#00ff00',
        grid_color: '#0000ff',
        slot_color: '#666',
        puzzle_completed_text: 'puzzle completed in %TIME s!',
        set: function(options) {
            for(p in options) {
                this[p] = options[p];
            }
            return this;
        }
    };

    /**
     * Singelton object which tracks the current puzzle state
     */
    pz.State = {
        dragoffx: 0,
        dragoffy: 0,
        dragging: false,
        selection: null,
        redraw: true,
        go_snap: false,
        shuffled: false,
        shuffle_time_start: null
    };

    /**
     * Wrapper for the event object
     * It calculates the pointer coordinates in the canvas system
     * @param {Event} e
     * @param {Element} canvas
     */
    pz.MouseEvent = function(e, canvas) {
        var element  = canvas,
            offset_x = 0,
            offset_y = 0;

        // Compute the total offset
        if (element.offsetParent !== undefined) {
            do {
                offset_x += element.offsetLeft;
                offset_y += element.offsetTop;
            } while ((element = element.offsetParent));
        }

        this.e = e;
        this.x = e.pageX - offset_x;
        this.y = e.pageY - offset_y;

    };

    /**
     * Slot object
     * @param {pz.Puzzle} puzzle instance
     * @param {Float} x0 initial x coordinate position
     * @param {Float} y0 initial y coordinate position
     * @param {Float} width
     * @param {Float} height
     * @param {Image} image image divided into slots
     * @param {Float} imgx0 offset used to crop the given image
     * @param {Float} imgy0 offset used to crop the given image
     */
    pz.Slot = function(puzzle, x0, y0, width, height, image, imgx0, imgy0) {

        this.x0 = x0;
        this.y0 = y0;
        this.image = image;
        this.imgx0 = imgx0;
        this.imgy0 = imgy0;

        this.width = width;
        this.height = height;

        this.x = x0;
        this.y = y0;
        this.in_place = true;

        this.puzzle = puzzle;
        this.state = pz.State;
        this.options = pz.Options;
        this.dispatcher = pz.EventDispatcher;

        /**
         * Sets the slot position
         * @param {Float} x
         * @param {Float} y
         */
        this.setPosition = function(x, y) {
            this.x = x;
            this.y = y;
            if(this.x !== this.x0 || this.y !== this.y0) {
                this.in_place = false;
            }
        }

        /**
         * Draws the slot original grid in the given context
         * @param {CanvasRenderingContext2D} context
         */
        this.drawGrid = function(context) {
            context.strokeStyle = this.options.grid_color;
            context.strokeRect(this.x0, this.y0, this.width, this.height);
        };

        /**
         * Draws the slot in the given context
         * If the slot is the selected one the drawing is performed at the end of the cycle
         * @param {CanvasRenderingContext2D} context
         */
        this.draw = function(context) {

            if(this.state.selection == this) {
                var bring_to_back = false;
                if(this.snapCondition() && this.state.go_snap) {
                    this.x = this.x0;
                    this.y = this.y0;
                    bring_to_back = true;
                    this.in_place = true;
                }
                this.dispatcher.registerOnlyOnce('draw_ended', this, function(evt_name, context) {
                    this.actuallyDraw(context, bring_to_back);
                    this.state.redraw = true;
                }, true);
            }
            else {
                this.actuallyDraw(context, false);
            }
        };

        /**
         * Checks if the snap condition is verified
         */
        this.snapCondition = function() {
            return (Math.abs(this.x - this.x0) < this.options.snap_offset && Math.abs(this.y - this.y0) < this.options.snap_offset) || false;
        }

        /**
         * Actually draws the slot
         * @param {CanvasRenderingContext2D} context
         * @param {Boolean} bring_to_back
         */
        this.actuallyDraw = function(context, bring_to_back) {
            context.strokeStyle = this.snapCondition() ? this.options.snap_color : this.options.slot_color;
            context.drawImage(this.image, this.imgx0, this.imgy0, this.width, this.height, this.x, this.y, this.width, this.height);
            context.strokeRect(this.x, this.y, this.width, this.height);
            this.puzzle.addToOrderedSlots(this, bring_to_back);
        };

        /**
         * Checks if the slot contains the given point
         * @param {Float} x
         * @param {Float} y
         * @return {Boolean}
         */
        this.contains = function(x, y) {
            return x >= this.x && x <= (this.x + this.width) && y > this.y && y < (this.y + this.height) || false;
        }

    };

    /**
     * Main controller
     */
    pz.Puzzle = function(img_id, options) {

        this.options = pz.Options.set(options);
        this.image = document.getElementById(img_id);

        /**
         * Initializes the puzzle
         */
        this.init = function() {

            // create canvas
            this.canvas = document.createElement('canvas');
            this.canvas.id = "canvas_" + img_id;
            this.canvas.width = this.image.naturalWidth + 2 * this.options.margin;
            this.canvas.height = this.image.naturalHeight + 2 * this.options.margin;
            this.canvas.style.border = '1px solid #000';
            this.context = this.canvas.getContext('2d');

            this.state = pz.State;
            this.dispatcher = pz.EventDispatcher;

            this.createGrid();
            this.addEvents();

            // insert in dom
            if(this.options.render_to) {
                document.getElementById(this.options.render_to).appendChild(this.canvas);
            }
            else {
                document.body.appendChild(this.canvas);
            }
            if(this.options.hide_original) {
                this.image.style.display = 'none';
            }

            // set the redraw interval
            var self = this;
            setInterval(function() { self.draw(); }, 30);

        };

        /**
         * Creates the grid
         */
        this.createGrid = function() {

            this.slots = [];

            var rows         = this.options.rows,
                cols         = this.options.cols,
                margin       = this.options.margin,
                slots_number = rows * cols,
                slot_width   = Math.floor(this.image.naturalWidth / cols),
                slot_height  = Math.floor(this.image.naturalHeight / rows);

            console.log('puzzle: slot size ', slot_width, 'x', slot_height);

            var x   = margin,
                y   = margin,
                col = 0;

            for (var i = 0; i < slots_number; i++) {
                col++;
                var slot = new pz.Slot(this, x, y, slot_width, slot_height, this.image, x - margin, y - margin);
                if(col % cols == 0) {
                    x  = margin;
                    y += slot_height;
                }
                else {
                    x += slot_width;
                }
                this.slots.push(slot);
            }

        }

        /**
         * Shuffles the slots
         */
        this.shuffle = function() {

            for (var i = 0, len = this.slots.length; i < len; i++) {
                this.slots[i].setPosition(Math.random() * (this.canvas.width - this.slots[i].width), Math.random() * (this.canvas.height - this.slots[i].height));
            }
            this.state.shuffled = true;
            this.state.shuffle_time_start = new Date().getTime();
            this.state.redraw = true;
            this.dispatcher.registerOnlyOnce('puzzle_completed', this, function() {
                this.state.shuffled = false;
                var time = (new Date().getTime() - this.state.shuffle_time_start) / 1000;
                this.state.shuffle_time_start = null;
                alert(this.options.puzzle_completed_text.replace("%TIME", (Math.round(time * 100) / 100)));
            });
        };

        /**
         * Adds the drag events
         */
        this.addEvents = function() {
            var self = this;
            //fixes a problem where double clicking causes text to get selected on the canvas
            this.canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
            // Up, down, and move are for dragging
            this.canvas.addEventListener('mousedown', function(e) {
                if(self.options.move_after_shuffle && !self.state.shuffled) {
                    return;
                }
                var evt = new pz.MouseEvent(e, self.canvas);
                for(var i = self.slots.length - 1; i >= 0; i--) {
                    if(self.slots[i].contains(evt.x, evt.y)) {
                        var slot = self.slots[i];
                        // Keep track of where in the object we clicked
                        // so we can move it smoothly (see mousemove)
                        self.state.dragoffx = evt.x - slot.x;
                        self.state.dragoffy = evt.y - slot.y;
                        self.state.dragging = true;
                        self.state.selection = slot;
                        self.state.redraw = true;
                        return;
                    }
                }
                // havent returned means we have failed to select anything.
                // If there was an object selected, we deselect it
                if(self.state.selection) {
                    self.state.selection = null;
                }
            }, true);

            this.canvas.addEventListener('mousemove', function(e) {
                if(self.options.move_after_shuffle && !self.state.shuffled) {
                    return;
                }
                if(self.state.dragging){
                    var evt = new pz.MouseEvent(e, self.canvas);
                    // We don't want to drag the object by its top-left corner,
                    // we want to drag from where we clicked.
                    // Thats why we saved the offset and use it here
                    self.state.selection.setPosition(evt.x - self.state.dragoffx, evt.y - self.state.dragoffy);
                    self.state.redraw = true;
                }
            }, true);

            this.canvas.addEventListener('mouseup', function(e) {
                if(self.options.move_after_shuffle && !self.state.shuffled) {
                    return;
                }
                self.state.dragging = false;
                self.state.go_snap = true;
                self.state.redraw = true;
                self.dispatcher.registerOnlyOnce('draw_ended', this, function(evt, context) {
                    self.state.go_snap = false;
                    self.state.selection = null;
                });
            }, true);

        }

        /**
         * Draws the canvas
         */
        this.draw = function() {
            if(this.state.redraw) {
                this.ordered_slots = [];
                this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.context.beginPath();
                for (var i = 0, len = this.slots.length; i < len; i++) {
                    this.slots[i].drawGrid(this.context);
                }
                for (var i = 0, len = this.slots.length; i < len; i++) {
                    this.slots[i].draw(this.context);
                }
                this.state.redraw = false;
                this.dispatcher.emit('draw_ended', this.context);
                this.slots = this.ordered_slots;
                if(this.checkCompleted()) {
                    this.dispatcher.emit('puzzle_completed');
                }
            }
        };

        /**
         * Cheks if the puzzle is completed
         * @return {Boolean}
         */
        this.checkCompleted = function() {
            for (var i = 0, len = this.slots.length; i < len; i++) {
                if(this.slots[i].in_place === false) {
                    return false;
                }
            }
            return true;
        };

        /**
         * Adds a slot to the ordered slots array
         * @param {pz.Slot} slot
         * @param {Boolean} bring_to_back
         */
        this.addToOrderedSlots = function(slot, bring_to_back) {
            if(typeof bring_to_back !== 'undefined' && bring_to_back) {
                this.ordered_slots = [slot].concat(this.ordered_slots);
            }
            else {
                this.ordered_slots.push(slot);
            }
        }

        this.image.onload = this.init();

    }


})();



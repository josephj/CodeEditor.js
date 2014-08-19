/*global window:true, $:true, CodeMirror:true */
/**
 * Required CSS files:
 *
 * <link rel="stylesheet" href="/media/css/lib/codemirror.css"/>
 * <link rel="stylesheet" href="/media/css/lib/codemirror/lint.css"/>
 *
 * Required JavaScript files:
 *
 * <script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
 * <script src="/media/js/lib/ZeroClipboard.min.js"></script><!-- Optional -->
 * <script src="/media/js/lib/codemirror/codemirror.min.js?<?=ASSET_TIMESTAMP?>"></script>
 * <script src="/media/js/common/stackla_code_editor.js?<?=ASSET_TIMESTAMP?>"></script>
 *
 * Via HTML:
 *
 * <textarea data-input="codeeditor" data-language="json"></textarea>
 * <textarea name="source_css" data-input="codeeditor" data-language="less" data-compile-to="[name=compile_css]"></textarea>
 * <textarea name="compile_css"></textarea>
 *
 * Via JavaScript:
 *
 * $('textarea').codeeditor({language: 'json'});
 * $('textarea').codeeditor('val', 'function () { alert('hello'); }');
 */
(function () {

    var _editors = [],
        _hasClipboard = false,
        proto;

    /**
     * A code editor widget.
     *
     * @constructor CodeEditor
     * @param el {DOM|HTMLSelector|jQuery} The textarea element
     * @param attrs {Object} The setting object
     */
    function CodeEditor(el, attrs) {
        var that = this;
        that.el = $(el)[0];
        that.editor = null;
        that.value = "";
        that.compileTo = attrs.compileTo || null;
        that.copiable = (attrs.copiable === true) ? true : false;
        that.onChange = ($.isFunction(attrs.onChange)) ? attrs.onChange : function () {};
        that.lessParser = new(less.Parser);
        that.readonly = (attrs.readonly === true) ? true : false;
        that.language = attrs.language || 'javascript';
        if (!el.length) {
            throw Error('No matched element!');
        }
        if (!CodeMirror) {
            throw Error('CodeMirror doesn\'t exist!');
        }
    }

    // Default setting for CodeMirror
    CodeEditor.DEFAULT_SETTING = {
        indentWithTabs: true,
        indentUnit: 4,
        smartIndent: true,
        tabSize: 4,
        lineNumbers: true
    };

    /**
     * Get all existing editor instance.
     *
     * @method getInstances
     * @static
     */
    CodeEditor.getInstances = function () {
        return _editors;
    };

    proto = {
        handleChange: function (mirror) {
            var that = this,
                value;
            if (that.compileTo) {
                value = that.get();
                value = that.parse(value.toString());
                if (value !== false) {
                    $(that.compileTo).val(value);
                }
            }
            if (value !== false) {
                that.onChange.call(that, value);
            }
        },
        parse: function (value) {
            var that = this;
            if (that.language === 'less') {
                that.lessParser.parse(value, function (err, tree) {
                    if (err) {
                        value = false;
                        return;
                    }
                    try {
                        value = tree.toCSS();
                    } catch (e) {
                        value = false;
                        return;
                    }
                });
            }
            return value;
        },
        save: function () {
            var that = this;
            that.editor.save();
        },
        destroy: function () {
            var that = this;
            that.editor.toTextArea();
            $(that.el).removeData('codeeditor');
            that = null;
        },
        get: function () {
            var that = this;
            return that.editor.getDoc().getValue();
        },
        /**
         * Update value in editor
         *
         * @method update
         * @param value {String}
         * @return void
         */
        update: function (value) {
            var that = this;
            that.editor.getDoc().setValue(value);
        },
        val: function (value) {
            var that = this;
            if (typeof value !== 'undefined') {
                that.update(value);
            } else {
                return that.get();
            }
        },
        /**
         * Render code editor
         *
         * @method render
         * @return void
         */
        render: function () {
            var that = this,
                setting = {readOnly: that.readonly},
                editor, $editor, buttonEl;

            switch (that.language) {
            case 'css':
                $.extend(setting, CodeEditor.DEFAULT_SETTING, {
                    mode: 'text/css',
                    gutters: ["CodeMirror-lint-markers"],
                    lint: true
                });
                break;
            case 'less':
                $.extend(setting, CodeEditor.DEFAULT_SETTING, {
                    mode: 'text/x-less',
                    matchBrackets : true,
                    gutters: ["CodeMirror-lint-markers"],
                    lint: true
                });
                break;
            case 'html':
                $.extend(setting, CodeEditor.DEFAULT_SETTING, {
                    mode: 'text/html',
                    htmlMode: true,
                    gutters: ["CodeMirror-lint-markers"]
                });
                break;
            case 'javascript':
                $.extend(setting, CodeEditor.DEFAULT_SETTING, {
                    mode: 'text/javascript',
                    gutters: ["CodeMirror-lint-markers"],
                    lint: true
                });
                break;
            case 'json':
                $.extend(setting, CodeEditor.DEFAULT_SETTING, {
                    mode: 'application/json',
                    gutters: ["CodeMirror-lint-markers"],
                    lint: true
                });
                break;
            case 'mustache':
                $.extend(setting, CodeEditor.DEFAULT_SETTING, {mode: 'mustache'});
                break;
            default:
                $.extend(setting, CodeEditor.DEFAULT_SETTING);
            }
            editor = CodeMirror.fromTextArea(that.el, setting);
            editor.on('change', $.proxy(that.handleChange, that));
            that.editor = editor;
            _editors.push(editor);
            if (that.compileTo) {
                value = that.get();
                value = that.parse(value.toString());
                if (value !== false) {
                    $(that.compileTo).val(value);
                }
            }

            if (that.copiable) {

                if (!_hasClipboard) {
                    ZeroClipboard.config({swfPath: '/media/js/lib/ZeroClipboard.swf'});
                    _hasClipboard = true;
                    $('head').append([
                        '<style>',
                        '.codeeditor-copy-button {',
                        '    position: absolute;',
                        '    bottom: 20px;',
                        '    right: 10px;',
                        '}',
                        '</style>'
                    ].join('\n'));
                }

                $editor = $(that.el).next('.CodeMirror');
                $editor.append('<button class="mws-button gray codeeditor-copy-button" type="button">Copy to clipboard</button>');
                buttonEl = $editor.find('.codeeditor-copy-button')[0];

                that._clipboard = new ZeroClipboard(buttonEl);
                that._clipboard.on('copy', function () {
                    that._clipboard.setText(that.el.value);
                    buttonEl.innerHTML = 'Copied';
                    setTimeout(function () {
                        buttonEl.innerHTML = 'Copy to clipboard';
                    }, 1500);
                });
            }

            $(that.el).data('codeeditor', that); // Save editor to data attribute so that we won't create the same instance again.

            return editor;
        }
    };
    $.extend(CodeEditor.prototype, proto);

    // Create jQuery Plugin
    $.fn.codeeditor = function (option, value) {
        this.each(function () {
            var $el = $(this),
                attrs, editor;

            // Generate config object
            attrs = ($.isPlainObject(option)) ? option : {};
            attrs = $.extend(attrs, $el.data());

            // Render code editor
            editor = $el.data('codeeditor');
            if (!editor) {
                editor = new CodeEditor($el, attrs);
                editor.render();
            }

            // Allow user to update value via JavaScript
            if (typeof option === 'string' && editor[option]) {
                editor[option].call(editor, value);
            }
        });
    };
    $.fn.codeeditor.Constructor = CodeEditor;

    // Initial automatically
    $('[data-input=codeeditor]').codeeditor();
    $(function() {
        $('[data-input=codeeditor]').codeeditor();
    });

    // Promote to global
    window.CodeEditor = CodeEditor;

}());

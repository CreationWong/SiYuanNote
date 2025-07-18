import {Divider} from "./Divider";
import {Font, hasSameTextStyle, setFontStyle} from "./Font";
import {ToolbarItem} from "./ToolbarItem";
import {
    fixTableRange,
    focusBlock,
    focusByRange,
    focusByWbr,
    getEditorRange,
    getSelectionPosition,
    selectAll,
    setFirstNodeRange,
    setLastNodeRange
} from "../util/selection";
import {hasClosestBlock, hasClosestByAttribute, hasClosestByClassName} from "../util/hasClosest";
import {Link} from "./Link";
import {setPosition} from "../../util/setPosition";
import {transaction, updateTransaction} from "../wysiwyg/transaction";
import {Constants} from "../../constants";
import {copyPlainText, openByMobile, readClipboard, setStorageVal} from "../util/compatibility";
import {upDownHint} from "../../util/upDownHint";
import {highlightRender} from "../render/highlightRender";
import {getContenteditableElement, hasNextSibling, hasPreviousSibling} from "../wysiwyg/getBlock";
import {processRender} from "../util/processCode";
import {BlockRef} from "./BlockRef";
import {hintRenderTemplate, hintRenderWidget} from "../hint/extend";
import {blockRender} from "../render/blockRender";
/// #if !BROWSER
import {openBy} from "../../editor/util";
/// #endif
import {fetchPost} from "../../util/fetch";
import {isArrayEqual, isMobile} from "../../util/functions";
import * as dayjs from "dayjs";
import {insertEmptyBlock} from "../../block/util";
import {matchHotKey} from "../util/hotKey";
import {hideElements} from "../ui/hideElements";
import {electronUndo} from "../undo";
import {previewTemplate, toolbarKeyToMenu} from "./util";
import {hideMessage, showMessage} from "../../dialog/message";
import {InlineMath} from "./InlineMath";
import {InlineMemo} from "./InlineMemo";
import {mathRender} from "../render/mathRender";
import {linkMenu} from "../../menus/protyle";
import {addScript} from "../util/addScript";
import {confirmDialog} from "../../dialog/confirmDialog";
import {paste, pasteAsPlainText, pasteEscaped} from "../util/paste";
import {escapeHtml} from "../../util/escape";
import {resizeSide} from "../../history/resizeSide";

export class Toolbar {
    public element: HTMLElement;
    public subElement: HTMLElement;
    public subElementCloseCB: () => void;
    public range: Range;
    public toolbarHeight: number;

    constructor(protyle: IProtyle) {
        const options = protyle.options;
        const element = document.createElement("div");
        element.className = "protyle-toolbar fn__none";
        this.element = element;
        this.subElement = document.createElement("div");
        /// #if MOBILE
        this.subElement.className = "protyle-util fn__none protyle-util--mobile";
        /// #else
        this.subElement.className = "protyle-util fn__none";
        /// #endif
        this.toolbarHeight = 29;
        protyle.app.plugins.forEach(item => {
            const pluginToolbar = item.updateProtyleToolbar(options.toolbar);
            pluginToolbar.forEach(toolbarItem => {
                if (typeof toolbarItem === "string" || Constants.INLINE_TYPE.concat("|").includes(toolbarItem.name) || !toolbarItem.hotkey) {
                    return;
                }
                if (window.siyuan.config.keymap.plugin && window.siyuan.config.keymap.plugin[item.name] && window.siyuan.config.keymap.plugin[item.name][toolbarItem.name]) {
                    toolbarItem.hotkey = window.siyuan.config.keymap.plugin[item.name][toolbarItem.name].custom;
                }
            });
            options.toolbar = toolbarKeyToMenu(pluginToolbar);
        });
        options.toolbar.forEach((menuItem: IMenuItem) => {
            const itemElement = this.genItem(protyle, menuItem);
            this.element.appendChild(itemElement);
        });
    }

    public update(protyle: IProtyle) {
        this.element.innerHTML = "";
        protyle.options.toolbar = toolbarKeyToMenu(Constants.PROTYLE_TOOLBAR);
        protyle.app.plugins.forEach(item => {
            const pluginToolbar = item.updateProtyleToolbar(protyle.options.toolbar);
            pluginToolbar.forEach(toolbarItem => {
                if (typeof toolbarItem === "string" || Constants.INLINE_TYPE.concat("|").includes(toolbarItem.name) || !toolbarItem.hotkey) {
                    return;
                }
                if (window.siyuan.config.keymap.plugin && window.siyuan.config.keymap.plugin[item.name] && window.siyuan.config.keymap.plugin[item.name][toolbarItem.name]) {
                    toolbarItem.hotkey = window.siyuan.config.keymap.plugin[item.name][toolbarItem.name].custom;
                }
            });
            protyle.options.toolbar = toolbarKeyToMenu(pluginToolbar);
        });
        protyle.options.toolbar.forEach((menuItem: IMenuItem) => {
            const itemElement = this.genItem(protyle, menuItem);
            this.element.appendChild(itemElement);
        });
    }

    public render(protyle: IProtyle, range: Range, event?: KeyboardEvent) {
        this.range = range;
        let nodeElement = hasClosestBlock(range.startContainer);
        if (isMobile() || !nodeElement || protyle.disabled || nodeElement.classList.contains("av")) {
            this.element.classList.add("fn__none");
            return;
        }
        // https://github.com/siyuan-note/siyuan/issues/5157
        let hasText = false;
        Array.from(range.cloneContents().childNodes).find(item => {
            // zwsp 不显示工具栏
            if (item.textContent.length > 0 && item.textContent !== Constants.ZWSP) {
                if (item.nodeType === 1 && (item as HTMLElement).classList.contains("img")) {
                    // 图片不显示工具栏
                } else {
                    hasText = true;
                    return true;
                }
            }
        });
        if (!hasText ||
            // 拖拽图片到最右侧
            (range.commonAncestorContainer.nodeType !== 3 && (range.commonAncestorContainer as HTMLElement).classList.contains("img"))) {
            this.element.classList.add("fn__none");
            return;
        }
        // shift+方向键或三击选中，不同的块 https://github.com/siyuan-note/siyuan/issues/3891
        const startElement = hasClosestBlock(range.startContainer);
        const endElement = hasClosestBlock(range.endContainer);
        if (startElement && endElement && !startElement.isSameNode(endElement)) {
            if (event) { // 在 keyup 中使用 shift+方向键选中
                if (event.key === "ArrowLeft") {
                    this.range = setLastNodeRange(getContenteditableElement(startElement), range, false);
                } else if (event.key === "ArrowRight") {
                    this.range = setFirstNodeRange(getContenteditableElement(endElement), range);
                    this.range.collapse(false);
                } else if (event.key === "ArrowUp") {
                    this.range = setFirstNodeRange(getContenteditableElement(endElement), range);
                    nodeElement = hasClosestBlock(endElement);
                    if (!nodeElement) {
                        return;
                    }
                } else if (event.key === "ArrowDown") {
                    this.range = setLastNodeRange(getContenteditableElement(startElement), range, false);
                }
            } else {
                this.range = setLastNodeRange(getContenteditableElement(nodeElement), range, false);
            }
            focusByRange(this.range);
            if (this.range.toString() === "") {
                this.element.classList.add("fn__none");
                return;
            }
        }
        // 需放在 range 修改之后，否则 https://github.com/siyuan-note/siyuan/issues/4726
        if (nodeElement.getAttribute("data-type") === "NodeCodeBlock") {
            this.element.classList.add("fn__none");
            return;
        }
        const rangePosition = getSelectionPosition(nodeElement, range);
        this.element.classList.remove("fn__none");
        this.toolbarHeight = this.element.clientHeight;
        const y = rangePosition.top - this.toolbarHeight - 4;
        this.element.setAttribute("data-inity", y + Constants.ZWSP + protyle.contentElement.scrollTop.toString());
        setPosition(this.element, rangePosition.left - 52, Math.max(y, protyle.element.getBoundingClientRect().top + 30));
        this.element.querySelectorAll(".protyle-toolbar__item--current").forEach(item => {
            item.classList.remove("protyle-toolbar__item--current");
        });
        const types = this.getCurrentType();
        types.forEach(item => {
            if (["search-mark", "a", "block-ref", "virtual-block-ref", "text", "file-annotation-ref", "inline-math",
                "inline-memo", "", "backslash"].includes(item)) {
                return;
            }
            const itemElement = this.element.querySelector(`[data-type="${item}"]`);
            if (itemElement) {
                itemElement.classList.add("protyle-toolbar__item--current");
            }
        });
    }

    public getCurrentType(range = this.range) {
        let types: string[] = [];
        let startElement = range.startContainer as HTMLElement;
        if (startElement.nodeType === 3) {
            startElement = startElement.parentElement;
        } else if (startElement.childElementCount > 0 && startElement.childNodes[range.startOffset]?.nodeType !== 3) {
            startElement = startElement.childNodes[range.startOffset] as HTMLElement;
            if (startElement?.tagName === "WBR") {
                startElement = startElement.parentElement;
            }
        }
        if (!startElement || startElement.nodeType === 3) {
            return [];
        }
        if (!["DIV", "TD", "TH", "TR"].includes(startElement.tagName)) {
            types = (startElement.getAttribute("data-type") || "").split(" ");
        }
        let endElement = range.endContainer as HTMLElement;
        if (endElement.nodeType === 3) {
            endElement = endElement.parentElement;
        } else if (endElement.childElementCount > 0 && endElement.childNodes[range.endOffset]?.nodeType !== 3) {
            endElement = endElement.childNodes[range.endOffset] as HTMLElement;
        }
        if (types.length === 0 && (!endElement || endElement.nodeType === 3)) {
            return [];
        }
        if (endElement && !["DIV", "TD", "TH", "TR"].includes(endElement.tagName) && !startElement.isSameNode(endElement)) {
            types = types.concat((endElement.getAttribute("data-type") || "").split(" "));
        }
        range.cloneContents().childNodes.forEach((item: HTMLElement) => {
            if (item.nodeType !== 3) {
                types = types.concat((item.getAttribute("data-type") || "").split(" "));
            }
        });
        types = [...new Set(types)];
        types.find((item, index) => {
            if (item === "") {
                types.splice(index, 1);
                return true;
            }
        });
        return types;
    }

    public setInlineMark(protyle: IProtyle, type: string, action: "range" | "toolbar", textObj?: ITextOption) {
        const nodeElement = hasClosestBlock(this.range.startContainer);
        if (!nodeElement || nodeElement.getAttribute("data-type") === "NodeCodeBlock") {
            return;
        }
        const endElement = hasClosestBlock(this.range.endContainer);
        if (!endElement) {
            return;
        }
        // 三击后还没有重新纠正 range 时使用快捷键标记会导致异常 https://github.com/siyuan-note/siyuan/issues/7068
        if (!nodeElement.isSameNode(endElement)) {
            this.range = setLastNodeRange(getContenteditableElement(nodeElement), this.range, false);
        }

        let rangeTypes: string[] = [];
        this.range.cloneContents().childNodes.forEach((item: HTMLElement) => {
            if (item.nodeType !== 3) {
                rangeTypes = rangeTypes.concat((item.getAttribute("data-type") || "").split(" "));
            }
        });
        const rangeStartNextSibling = hasNextSibling(this.range.startContainer);
        const isSameNode = this.range.startContainer.isSameNode(this.range.endContainer) ||
            (rangeStartNextSibling && rangeStartNextSibling.isSameNode(this.range.endContainer) &&
                this.range.startContainer.parentElement.isSameNode(this.range.endContainer.parentElement));
        if (this.range.startContainer.nodeType === 3 && this.range.startContainer.parentElement.tagName === "SPAN" &&
            isSameNode &&
            this.range.startOffset > -1 && this.range.endOffset <= this.range.endContainer.textContent.length) {
            rangeTypes = rangeTypes.concat((this.range.startContainer.parentElement.getAttribute("data-type") || "").split(" "));
        }
        const selectText = this.range.toString();
        let keepZWPS = false;
        // ctrl+b/u/i  https://github.com/siyuan-note/siyuan/issues/14820
        if (!selectText && this.range.startOffset === 1 && this.range.startContainer.textContent === Constants.ZWSP) {
            let newElement;
            if (this.range.startContainer.nodeType === 1) {
                newElement = this.range.startContainer as HTMLElement;
            } else {
                newElement = this.range.startContainer.parentElement;
            }
            if (newElement.tagName === "SPAN") {
                rangeTypes = rangeTypes.concat((newElement.getAttribute("data-type") || "").split(" "));
                this.range.setStart(newElement.firstChild, 0);
                this.range.setEnd(newElement.lastChild, newElement.lastChild.textContent.length || 0);
                keepZWPS = true;
            }
        }
        if (rangeTypes.length === 1) {
            // https://github.com/siyuan-note/siyuan/issues/6501
            // https://github.com/siyuan-note/siyuan/issues/12877
            if (["block-ref", "virtual-block-ref", "file-annotation-ref", "a", "inline-memo", "inline-math", "tag"].includes(rangeTypes[0]) && type === "clear") {
                return;
            }
        }
        // https://github.com/siyuan-note/siyuan/issues/14534
        if (rangeTypes.includes("text") && type === "text" && textObj && this.range.startContainer.nodeType === 3 && this.range.startContainer.isSameNode(this.range.endContainer)) {
            const selectParentElement = this.range.startContainer.parentElement;
            if (selectParentElement && hasSameTextStyle(null, selectParentElement, textObj)) {
                return;
            }
        }
        fixTableRange(this.range);

        let contents;
        let html;
        let needWrapTarget;
        if (this.range.startContainer.nodeType === 3 && this.range.startContainer.parentElement.tagName === "SPAN" &&
            isSameNode) {
            if (this.range.startOffset > -1 && this.range.endOffset <= this.range.endContainer.textContent.length) {
                needWrapTarget = this.range.startContainer.parentElement;
            }
            if ((
                    this.range.startOffset !== 0 ||
                    // https://github.com/siyuan-note/siyuan/issues/14869
                    (this.range.startOffset === 0 && this.range.startContainer.previousSibling?.nodeType === 3 &&
                        this.range.startContainer.previousSibling.parentElement.isSameNode(this.range.startContainer.parentElement))
                ) && (
                    this.range.endOffset !== this.range.endContainer.textContent.length ||
                    // https://github.com/siyuan-note/siyuan/issues/14869#issuecomment-2911553387
                    (
                        this.range.endOffset === this.range.endContainer.textContent.length &&
                        this.range.endContainer.nextSibling?.nodeType === 3 &&
                        this.range.endContainer.nextSibling.parentElement.isSameNode(this.range.endContainer.parentElement)
                    )
                ) &&
                !(this.range.startOffset === 1 && this.range.startContainer.textContent.startsWith(Constants.ZWSP))) {
                // 切割元素
                const parentElement = this.range.startContainer.parentElement;
                const afterElement = document.createElement("span");
                const attributes = parentElement.attributes;
                for (let i = 0; i < attributes.length; i++) {
                    afterElement.setAttribute(attributes[i].name, attributes[i].value);
                }
                this.range.insertNode(document.createElement("wbr"));
                html = nodeElement.outerHTML;
                contents = this.range.extractContents();
                this.range.setEnd(parentElement.lastChild, parentElement.lastChild.textContent.length);
                afterElement.append(this.range.extractContents());
                parentElement.after(afterElement);
                this.range.setStartBefore(afterElement);
                this.range.collapse(true);
            }
        }
        let isEndSpan = false;
        // https://github.com/siyuan-note/siyuan/issues/7200
        if (this.range.endOffset === this.range.startContainer.textContent.length &&
            !["DIV", "TD", "TH", "TR"].includes(this.range.endContainer.parentElement.tagName) &&
            !hasNextSibling(this.range.endContainer)) {
            this.range.setEndAfter(this.range.endContainer.parentElement);
            isEndSpan = true;
        }
        if (this.range.startOffset === 0 &&
            !["DIV", "TD", "TH", "TR"].includes(this.range.startContainer.parentElement.tagName) &&
            !hasPreviousSibling(this.range.startContainer)) {
            this.range.setStartBefore(this.range.startContainer.parentElement);
        }
        if (!html) {
            this.range.insertNode(document.createElement("wbr"));
            html = nodeElement.outerHTML;
            contents = this.range.extractContents();
        }
        this.mergeNode(contents.childNodes);
        contents.childNodes.forEach((item: HTMLElement) => {
            if (item.nodeType === 3 && item.textContent === Constants.ZWSP) {
                item.remove();
            }
            if (item.nodeType === 1 && item.textContent === "" && item.tagName === "SPAN") {
                item.remove();
            }
        });
        if (selectText && this.range.startContainer.nodeType !== 3) {
            let emptyNode: Element = this.range.startContainer.childNodes[this.range.startOffset] as HTMLElement;
            if (!emptyNode) {
                emptyNode = this.range.startContainer.childNodes[this.range.startOffset - 1] as HTMLElement;
            }
            if (emptyNode && emptyNode.nodeType === 3) {
                if ((this.range.startContainer as HTMLElement).tagName === "DIV") {
                    emptyNode = emptyNode.previousSibling as HTMLElement;
                } else {
                    emptyNode = this.range.startContainer as HTMLElement;
                }
            }
            if (emptyNode && emptyNode.nodeType !== 3 && emptyNode.textContent.replace(Constants.ZWSP, "") === "" &&
                !["TD", "TH"].includes(emptyNode.tagName)) {
                emptyNode.remove();
            }
        }
        // 选择 span 中的部分需进行包裹
        if (needWrapTarget) {
            const attributes = needWrapTarget.attributes;
            contents.childNodes.forEach(item => {
                if (item.nodeType === 3) {
                    const spanElement = document.createElement("span");
                    for (let i = 0; i < attributes.length; i++) {
                        spanElement.setAttribute(attributes[i].name, attributes[i].value);
                    }
                    spanElement.innerHTML = item.textContent;
                    item.replaceWith(spanElement);
                }
            });
        }
        const toolbarElement = isMobile() ? document.querySelector("#keyboardToolbar .keyboard__dynamic").nextElementSibling : this.element;
        const actionBtn = action === "toolbar" ? toolbarElement.querySelector(`[data-type="${type}"]`) : undefined;
        const newNodes: Node[] = [];
        let startContainer: Node;
        let endContainer: Node;
        let startOffset: number;
        let endOffset: number;
        if (type === "clear" || actionBtn?.classList.contains("protyle-toolbar__item--current") || (
            action === "range" && rangeTypes.length > 0 && rangeTypes.includes(type) && !textObj
        )) {
            // 移除
            if (type === "clear") {
                toolbarElement.querySelectorAll('[data-type="strong"],[data-type="em"],[data-type="u"],[data-type="s"],[data-type="mark"],[data-type="sup"],[data-type="sub"],[data-type="kbd"],[data-type="mark"],[data-type="code"]').forEach(item => {
                    item.classList.remove("protyle-toolbar__item--current");
                });
            } else if (actionBtn) {
                actionBtn.classList.remove("protyle-toolbar__item--current");
            }
            if (contents.childNodes.length === 0) {
                rangeTypes.find((itemType, index) => {
                    if (type === itemType) {
                        rangeTypes.splice(index, 1);
                        return true;
                    }
                });
                if (rangeTypes.length === 0 || type === "clear") {
                    newNodes.push(document.createTextNode(Constants.ZWSP));
                    startContainer = newNodes[0];
                } else {
                    let removeIndex = 0;
                    while (removeIndex < rangeTypes.length) {
                        if (["inline-memo", "text", "block-ref", "virtual-block-ref", "file-annotation-ref", "a"].includes(rangeTypes[removeIndex])) {
                            rangeTypes.splice(removeIndex, 1);
                        } else {
                            ++removeIndex;
                        }
                    }
                    const inlineElement = document.createElement("span");
                    inlineElement.setAttribute("data-type", rangeTypes.join(" "));
                    inlineElement.textContent = Constants.ZWSP;
                    newNodes.push(inlineElement);
                    startContainer = newNodes[0].firstChild;
                }
                keepZWPS = true;
                startOffset = 1;
            }
            contents.childNodes.forEach((item: HTMLElement) => {
                if (item.nodeType !== 3 && item.tagName !== "BR" && item.tagName !== "IMG" && !item.classList.contains("img")) {
                    const types = (item.getAttribute("data-type") || "").split(" ");
                    if (type === "clear") {
                        for (let i = 0; i < types.length; i++) {
                            if (textObj && textObj.type === "text") {
                                if ("text" === types[i]) {
                                    types.splice(i, 1);
                                    i--;
                                }
                            } else {
                                if (["kbd", "text", "strong", "em", "u", "s", "mark", "sup", "sub", "code"].includes(types[i])) {
                                    types.splice(i, 1);
                                    i--;
                                }
                            }
                        }
                    } else {
                        types.find((itemType, typeIndex) => {
                            if (type === itemType) {
                                types.splice(typeIndex, 1);
                                return true;
                            }
                        });
                    }
                    if (types.length === 0) {
                        newNodes.push(document.createTextNode(item.textContent));
                    } else {
                        if (type === "clear") {
                            item.style.color = "";
                            item.style.webkitTextFillColor = "";
                            item.style.webkitTextStroke = "";
                            item.style.textShadow = "";
                            item.style.backgroundColor = "";
                            item.style.fontSize = "";
                        }
                        item.setAttribute("data-type", types.join(" "));
                        newNodes.push(item);
                    }
                } else {
                    newNodes.push(item);
                }
            });
        } else {
            // 添加
            if (!this.element.classList.contains("fn__none") && type !== "text" && actionBtn) {
                actionBtn.classList.add("protyle-toolbar__item--current");
            }
            if (selectText === "") {
                const inlineElement = document.createElement("span");
                rangeTypes.push(type);

                // 遇到以下类型结尾不应继承 https://github.com/siyuan-note/siyuan/issues/7200
                if (isEndSpan) {
                    let removeIndex = 0;
                    while (removeIndex < rangeTypes.length) {
                        if (["inline-memo", "text", "block-ref", "virtual-block-ref", "file-annotation-ref", "a"].includes(rangeTypes[removeIndex])) {
                            rangeTypes.splice(removeIndex, 1);
                        } else {
                            ++removeIndex;
                        }
                    }
                    // https://github.com/siyuan-note/siyuan/issues/14421
                    if (rangeTypes.length === 0) {
                        rangeTypes.push(type);
                    }
                }
                inlineElement.setAttribute("data-type", [...new Set(rangeTypes)].join(" "));
                inlineElement.textContent = Constants.ZWSP;
                setFontStyle(inlineElement, textObj);
                newNodes.push(inlineElement);
                keepZWPS = true;
            } else {
                // https://github.com/siyuan-note/siyuan/issues/7477
                // https://github.com/siyuan-note/siyuan/issues/8825
                if (type === "block-ref") {
                    while (contents.childNodes.length > 1) {
                        contents.childNodes[0].remove();
                    }
                }
                contents.childNodes.forEach((item: HTMLElement) => {
                    let removeText = "";
                    if (item.nodeType === 3 && item.textContent) {
                        // https://github.com/siyuan-note/siyuan/issues/14204
                        while (item.textContent.endsWith("\n")) {
                            item.textContent = item.textContent.substring(0, item.textContent.length - 1);
                            removeText += "\n";
                        }
                        if (item.textContent) {
                            const inlineElement = document.createElement("span");
                            inlineElement.setAttribute("data-type", type);
                            inlineElement.textContent = item.textContent;
                            if (type === "a") {
                                if (!inlineElement.textContent) {
                                    inlineElement.textContent = "*";
                                }
                                textObj.color = textObj.color.split(Constants.ZWSP)[0];
                            }
                            setFontStyle(inlineElement, textObj);

                            if (type === "text" && !inlineElement.getAttribute("style")) {
                                newNodes.push(item);
                            } else {
                                newNodes.push(inlineElement);
                            }
                        }
                    } else if (item.nodeType === 1) {
                        let types = (item.getAttribute("data-type") || "").split(" ");
                        for (let i = 0; i < types.length; i++) {
                            // "backslash", "virtual-block-ref", "search-mark" 只能单独存在
                            if (["backslash", "virtual-block-ref", "search-mark"].includes(types[i])) {
                                types.splice(i, 1);
                                i--;
                            }
                        }
                        if (!types.includes("img")) {
                            types.push(type);
                        }
                        // 上标和下标不能同时存在 https://github.com/siyuan-note/insider/issues/1049
                        if (type === "sub" && types.includes("sup")) {
                            types.find((item, index) => {
                                if (item === "sup") {
                                    types.splice(index, 1);
                                    toolbarElement.querySelector('[data-type="sup"]').classList.remove("protyle-toolbar__item--current");
                                    return true;
                                }
                            });
                        } else if (type === "sup" && types.includes("sub")) {
                            types.find((item, index) => {
                                if (item === "sub") {
                                    types.splice(index, 1);
                                    toolbarElement.querySelector('[data-type="sub"]').classList.remove("protyle-toolbar__item--current");
                                    return true;
                                }
                            });
                        } else if (type === "block-ref" && (types.includes("a") || types.includes("file-annotation-ref"))) {
                            // 虚拟引用和链接/标注不能同时存在
                            types.find((item, index) => {
                                if (item === "a" || item === "file-annotation-ref") {
                                    types.splice(index, 1);
                                    return true;
                                }
                            });
                        } else if (type === "a" && (types.includes("block-ref") || types.includes("file-annotation-ref"))) {
                            // 链接和引用/标注不能同时存在
                            types.find((item, index) => {
                                if (item === "block-ref" || item === "file-annotation-ref") {
                                    types.splice(index, 1);
                                    return true;
                                }
                            });
                        } else if (type === "file-annotation-ref" && (types.includes("block-ref") || types.includes("a"))) {
                            // 引用和链接/标注不能同时存在
                            types.find((item, index) => {
                                if (item === "block-ref" || item === "a") {
                                    types.splice(index, 1);
                                    return true;
                                }
                            });
                        } else if (type === "inline-memo" && types.includes("inline-math")) {
                            // 数学公式和备注不能同时存在
                            types.find((item, index) => {
                                if (item === "inline-math") {
                                    types.splice(index, 1);
                                    return true;
                                }
                            });
                            if (item.querySelector(".katex")) {
                                // 选中完整的数学公式才进行备注 https://github.com/siyuan-note/siyuan/issues/13667
                                item.textContent = item.getAttribute("data-content");
                            }
                        } else if (type === "inline-math" && types.includes("inline-memo")) {
                            // 数学公式和备注不能同时存在
                            types.find((item, index) => {
                                if (item === "inline-memo") {
                                    types.splice(index, 1);
                                    return true;
                                }
                            });
                        }
                        types = [...new Set(types)];
                        if (item.tagName !== "BR" && item.tagName !== "IMG" && !types.includes("img")) {
                            item.setAttribute("data-type", types.join(" "));
                            if (type === "a") {
                                if (!item.textContent) {
                                    item.textContent = "*";
                                }
                                textObj.color = textObj.color.split(Constants.ZWSP)[0];
                            }
                            setFontStyle(item, textObj);
                            if (types.includes("text") && !item.getAttribute("style")) {
                                if (types.length === 1) {
                                    const tempText = document.createTextNode(item.textContent);
                                    newNodes.push(tempText);
                                } else {
                                    types.splice(types.indexOf("text"), 1);
                                    item.setAttribute("data-type", types.join(" "));
                                    newNodes.push(item);
                                }
                            } else {
                                newNodes.push(item);
                            }
                        } else {
                            newNodes.push(item);
                        }
                    }
                    if (removeText) {
                        newNodes.push(document.createTextNode(removeText));
                    }
                });
            }
        }
        // 插入元素
        for (let i = newNodes.length - 1; i > -1; i--) {
            this.range.insertNode(newNodes[i]);
        }
        if (newNodes.length === 1 && newNodes[0].textContent === Constants.ZWSP) {
            this.range.setStart(newNodes[0], 1);
            this.range.collapse(true);
            if (newNodes[0].nodeType !== 3) {
                // 不选中后，ctrl+g 光标重置
                const currentType = ((newNodes[0] as HTMLElement).getAttribute("data-type") || "").split(" ");
                if (currentType.includes("code") || currentType.includes("tag") || currentType.includes("kbd")) {
                    keepZWPS = false;
                }
            }
        }
        if (!keepZWPS) {
            // 合并元素
            for (let i = 0; i <= newNodes.length; i++) {
                let previousElement = i === newNodes.length ? newNodes[i - 1] as HTMLElement : hasPreviousSibling(newNodes[i]) as HTMLElement;
                if (previousElement.nodeType === 3 && previousElement.textContent === Constants.ZWSP) {
                    previousElement = hasPreviousSibling(previousElement) as HTMLElement;
                    if (previousElement) {
                        previousElement.nextSibling.remove();
                    }
                }
                let currentNode = newNodes[i] as HTMLElement;
                if (!currentNode) {
                    currentNode = hasNextSibling(newNodes[i - 1]) as HTMLElement;
                    if (currentNode && currentNode.nodeType === 3 && currentNode.textContent === Constants.ZWSP) {
                        currentNode = hasNextSibling(currentNode) as HTMLElement;
                        if (currentNode) {
                            currentNode.previousSibling.remove();
                        }
                    }
                }
                if (currentNode && currentNode.nodeType !== 3) {
                    const currentType = (currentNode.getAttribute("data-type") || "").split(" ");
                    if (currentNode.tagName !== "BR" &&
                        previousElement && previousElement.nodeType !== 3 &&
                        currentNode.nodeType !== 3 &&
                        isArrayEqual(currentType, (previousElement.getAttribute("data-type") || "").split(" ")) &&
                        hasSameTextStyle(currentNode, previousElement)) {
                        if (currentType.includes("code") || currentType.includes("tag") || currentType.includes("kbd")) {
                            if (currentNode.textContent.startsWith(Constants.ZWSP)) {
                                currentNode.textContent = currentNode.textContent.substring(1);
                            }
                        }
                        if (currentType.includes("inline-math")) {
                            // 数学公式合并 data-content https://github.com/siyuan-note/siyuan/issues/6028
                            currentNode.setAttribute("data-content", previousElement.getAttribute("data-content") + currentNode.getAttribute("data-content"));
                        } else if (currentType.includes("block-ref") && previousElement.getAttribute("data-id") === currentNode.getAttribute("data-id")) {
                            if (previousElement.dataset.subtype !== "d" || previousElement.dataset.subtype !== "d") {
                                currentNode.setAttribute("data-subtype", "s");
                                currentNode.textContent = previousElement.textContent + currentNode.textContent;
                            }
                        } else {
                            // 测试不存在 https://ld246.com/article/1664454663564 情况，故移除引用合并限制
                            // 搜索结果引用被高亮隔断需进行合并 https://github.com/siyuan-note/siyuan/issues/7588
                            currentNode.textContent = previousElement.textContent + currentNode.textContent;
                            // 如果为备注时，合并备注内容
                            if (currentType.includes("inline-memo")) {
                                currentNode.setAttribute("data-inline-memo-content", (previousElement.getAttribute("data-inline-memo-content") || "") +
                                    (currentNode.getAttribute("data-inline-memo-content") || ""));
                            }
                        }
                        if (!currentType.includes("inline-math")) {
                            if (i === 0) {
                                startContainer = currentNode;
                                startOffset = previousElement.textContent.length;
                            } else if (i === newNodes.length) {
                                endContainer = currentNode;
                                endOffset = previousElement.textContent.length;
                                if (!startContainer) {
                                    startContainer = currentNode;
                                } else if (startContainer.isSameNode(previousElement)) {
                                    startContainer = currentNode;
                                }
                            }
                        }
                        previousElement.remove();
                        if (i > 0) {
                            newNodes.splice(i - 1, 1);
                            i--;
                        }
                        if (newNodes.length === 0) {
                            newNodes.push(currentNode);
                            break;
                        }
                    }
                }
            }
            // 整理 zwsp
            for (let i = 0; i <= newNodes.length; i++) {
                const previousElement = i === newNodes.length ? newNodes[i - 1] as HTMLElement : hasPreviousSibling(newNodes[i]) as HTMLElement;
                let currentNode = newNodes[i] as HTMLElement;
                if (!currentNode) {
                    currentNode = hasNextSibling(newNodes[i - 1]) as HTMLElement;
                }
                if (!currentNode) {
                    if (previousElement.nodeType !== 3) {
                        const currentType = (previousElement.getAttribute("data-type") || "").split(" ");
                        if (currentType.includes("code") || currentType.includes("tag") || currentType.includes("kbd")) {
                            previousElement.insertAdjacentText("afterend", Constants.ZWSP);
                        }
                    }
                    break;
                }
                if (currentNode.nodeType === 3) {
                    if (previousElement && previousElement.nodeType === 3) {
                        if (currentNode.textContent.startsWith(Constants.ZWSP)) {
                            currentNode.textContent = currentNode.textContent.substring(1);
                        }
                        if (previousElement.textContent.endsWith(Constants.ZWSP)) {
                            previousElement.textContent = previousElement.textContent.substring(0, previousElement.textContent.length - 2);
                        }
                    } else {
                        const previousType = previousElement ? (previousElement.getAttribute("data-type") || "").split(" ") : [];
                        if (previousType.includes("code") || previousType.includes("tag") || previousType.includes("kbd")) {
                            if (!currentNode.textContent.startsWith(Constants.ZWSP)) {
                                currentNode.textContent = Constants.ZWSP + currentNode.textContent;
                            }
                        } else if (currentNode.textContent.startsWith(Constants.ZWSP)) {
                            currentNode.textContent = currentNode.textContent.substring(1);
                        }
                    }
                } else {
                    const currentType = currentNode.nodeType === 3 ? [] : (currentNode.getAttribute("data-type") || "").split(" ");
                    if (currentType.includes("code") || currentType.includes("tag") || currentType.includes("kbd")) {
                        if (!currentNode.textContent.startsWith(Constants.ZWSP)) {
                            currentNode.insertAdjacentText("afterbegin", Constants.ZWSP);
                        }
                        if (!previousElement || (previousElement.nodeType === 3 && previousElement.textContent.endsWith("\n"))) {
                            currentNode.insertAdjacentText("beforebegin", Constants.ZWSP);
                        }
                    } else if (currentNode.textContent.startsWith(Constants.ZWSP)) {
                        currentNode.textContent = currentNode.textContent.substring(1);
                    }
                    if (previousElement && previousElement.nodeType !== 3) {
                        const previousType = (previousElement.getAttribute("data-type") || "").split(" ");
                        if (previousType.includes("code") || previousType.includes("tag") || previousType.includes("kbd")) {
                            currentNode.insertAdjacentText("beforebegin", Constants.ZWSP);
                        }
                    }
                }
            }
        }
        nodeElement.setAttribute("updated", dayjs().format("YYYYMMDDHHmmss"));
        updateTransaction(protyle, nodeElement.getAttribute("data-node-id"), nodeElement.outerHTML, html);
        nodeElement.querySelectorAll("wbr").forEach(item => {
            item.remove();
        });
        if (startContainer && typeof startOffset === "number") {
            if (startContainer.nodeType === 3) {
                this.range.setStart(startContainer, startOffset);
            } else {
                this.range.setStart(startContainer.firstChild, startOffset);
            }
        }

        if (endContainer && typeof endOffset === "number") {
            if (endContainer.nodeType === 3) {
                this.range.setEnd(endContainer, endOffset);
            } else {
                this.range.setEnd(endContainer.firstChild, endOffset);
            }
        }
        focusByRange(this.range);

        const showMenuElement = newNodes[0] as HTMLElement;
        if (showMenuElement.nodeType !== 3) {
            const showMenuTypes = (showMenuElement.getAttribute("data-type") || "").split(" ");
            if (type === "inline-math") {
                mathRender(nodeElement);
                if (selectText === "" && showMenuTypes.includes("inline-math")) {
                    protyle.toolbar.showRender(protyle, showMenuElement, undefined, html);
                }
            } else if (type === "inline-memo") {
                if (!showMenuElement.getAttribute("data-inline-memo-content") &&
                    showMenuTypes.includes("inline-memo")) {
                    protyle.toolbar.showRender(protyle, showMenuElement, newNodes as Element[], html);
                }
            } else if (type === "a") {
                if (showMenuTypes.includes("a") &&
                    (showMenuElement.textContent.replace(Constants.ZWSP, "") === "" || !showMenuElement.getAttribute("data-href"))) {
                    linkMenu(protyle, showMenuElement, showMenuElement.getAttribute("data-href") ? true : false);
                }
            }
        }
        return newNodes;
    }

    public showRender(protyle: IProtyle, renderElement: Element, updateElements?: Element[], oldHTML?: string) {
        const nodeElement = hasClosestBlock(renderElement);
        if (!nodeElement) {
            return;
        }
        hideElements(["hint"], protyle);
        window.siyuan.menus.menu.remove();
        const id = nodeElement.getAttribute("data-node-id");
        const types = (renderElement.getAttribute("data-type") || "").split(" ");
        const html = oldHTML || nodeElement.outerHTML;
        let title = "HTML";
        let placeholder = "";
        const isInlineMemo = types.includes("inline-memo");
        switch (renderElement.getAttribute("data-subtype")) {
            case "abc":
                title = window.siyuan.languages.staff;
                break;
            case "echarts":
                title = window.siyuan.languages.chart;
                break;
            case "flowchart":
                title = "Flow Chart";
                break;
            case "graphviz":
                title = "Graphviz";
                break;
            case "mermaid":
                title = "Mermaid";
                break;
            case "mindmap":
                placeholder = `- foo
  - bar
- baz`;
                title = window.siyuan.languages.mindmap;
                break;
            case "plantuml":
                title = "UML";
                break;
            case "math":
                if (types.includes("NodeMathBlock")) {
                    title = window.siyuan.languages.math;
                } else {
                    title = window.siyuan.languages["inline-math"];
                }
                break;
        }
        if (types.includes("NodeBlockQueryEmbed")) {
            title = window.siyuan.languages.blockEmbed;
        } else if (isInlineMemo) {
            title = window.siyuan.languages.memo;
        }
        const isPin = this.subElement.querySelector('[data-type="pin"]')?.getAttribute("aria-label") === window.siyuan.languages.unpin;
        const pinData: IObject = {};
        if (isPin) {
            const textElement = this.subElement.querySelector(".b3-text-field") as HTMLTextAreaElement;
            pinData.styleH = textElement.style.height;
            pinData.styleW = textElement.style.width;
        } else {
            this.subElement.style.width = "";
            this.subElement.style.padding = "0";
        }
        this.subElement.innerHTML = `<div ${(isPin && this.subElement.firstElementChild.getAttribute("data-drag") === "true") ? 'data-drag="true"' : ""}><div class="block__icons block__icons--menu fn__flex" style="border-radius: var(--b3-border-radius-b) var(--b3-border-radius-b) 0 0;">
    <span class="fn__flex-1 resize__move">
        ${title}
    </span>
    <span class="fn__space"></span>
    <button data-type="refresh" class="block__icon block__icon--show b3-tooltips b3-tooltips__nw${(isPin && !this.subElement.querySelector('[data-type="refresh"]').classList.contains("block__icon--active")) ? "" : " block__icon--active"}${types.includes("NodeBlockQueryEmbed") ? " fn__none" : ""}" aria-label="${window.siyuan.languages.refresh}"><svg><use xlink:href="#iconRefresh"></use></svg></button>
    <span class="fn__space"></span>
    <button data-type="before" class="block__icon block__icon--show b3-tooltips b3-tooltips__nw${protyle.disabled ? " fn__none" : ""}" aria-label="${window.siyuan.languages["insert-before"]}"><svg><use xlink:href="#iconBefore"></use></svg></button>
    <span class="fn__space${protyle.disabled ? " fn__none" : ""}"></span>
    <button data-type="after" class="block__icon block__icon--show b3-tooltips b3-tooltips__nw${protyle.disabled ? " fn__none" : ""}" aria-label="${window.siyuan.languages["insert-after"]}"><svg><use xlink:href="#iconAfter"></use></svg></button>
    <span class="fn__space${protyle.disabled ? " fn__none" : ""}"></span>
    <button data-type="export" class="block__icon block__icon--show b3-tooltips b3-tooltips__nw" aria-label="${window.siyuan.languages.export} ${window.siyuan.languages.image}"><svg><use xlink:href="#iconImage"></use></svg></button>
    <span class="fn__space"></span>
    <button data-type="pin" class="block__icon block__icon--show b3-tooltips b3-tooltips__nw" aria-label="${isPin ? window.siyuan.languages.unpin : window.siyuan.languages.pin}"><svg><use xlink:href="#icon${isPin ? "Unpin" : "Pin"}"></use></svg></button>
    <span class="fn__space"></span>
    <button data-type="close" class="block__icon block__icon--show b3-tooltips b3-tooltips__nw" aria-label="${window.siyuan.languages.close}"><svg style="width: 10px;margin: 0 2px;"><use xlink:href="#iconClose"></use></svg></button>
</div>
<textarea ${protyle.disabled ? " readonly" : ""} spellcheck="false" class="b3-text-field b3-text-field--text fn__block" placeholder="${placeholder}" style="${isMobile() ? "" : "width:" + Math.max(480, renderElement.clientWidth * 0.7) + "px"};max-height:calc(80vh - 44px);min-height: 48px;min-width: 268px;border-radius: 0 0 var(--b3-border-radius-b) var(--b3-border-radius-b);font-family: var(--b3-font-family-code);"></textarea></div>`;
        const autoHeight = () => {
            textElement.style.height = textElement.scrollHeight + "px";
            if (isMobile()) {
                setPosition(this.subElement, 0, 0);
                return;
            }
            if (this.subElement.firstElementChild.getAttribute("data-drag") === "true") {
                if (textElement.getBoundingClientRect().bottom > window.innerHeight) {
                    this.subElement.style.top = window.innerHeight - this.subElement.clientHeight + "px";
                }
                return;
            }
            const bottom = nodeRect.bottom === nodeRect.top ? nodeRect.bottom + 26 : nodeRect.bottom;
            if (this.subElement.clientHeight <= window.innerHeight - bottom || this.subElement.clientHeight <= nodeRect.top) {
                if (types.includes("inline-math") || isInlineMemo) {
                    setPosition(this.subElement, nodeRect.left, bottom, nodeRect.height || 26);
                } else {
                    setPosition(this.subElement, nodeRect.left + (nodeRect.width - this.subElement.clientWidth) / 2, bottom, nodeRect.height || 26);
                }
            } else {
                setPosition(this.subElement, nodeRect.right, bottom);
            }
        };
        const headerElement = this.subElement.querySelector(".block__icons");
        headerElement.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const btnElement = hasClosestByClassName(target, "b3-tooltips");
            if (!btnElement) {
                if (event.detail === 2) {
                    const pingElement = headerElement.querySelector('[data-type="pin"]');
                    if (pingElement.getAttribute("aria-label") === window.siyuan.languages.unpin) {
                        pingElement.querySelector("svg use").setAttribute("xlink:href", "#iconPin");
                        pingElement.setAttribute("aria-label", window.siyuan.languages.pin);
                    } else {
                        pingElement.querySelector("svg use").setAttribute("xlink:href", "#iconUnpin");
                        pingElement.setAttribute("aria-label", window.siyuan.languages.unpin);
                    }
                    event.preventDefault();
                    event.stopPropagation();
                }
                return;
            }
            event.stopPropagation();
            switch (btnElement.getAttribute("data-type")) {
                case "close":
                    this.subElement.querySelector('[data-type="pin"]').setAttribute("aria-label", window.siyuan.languages.pin);
                    hideElements(["util"], protyle);
                    break;
                case "pin":
                    if (btnElement.getAttribute("aria-label") === window.siyuan.languages.unpin) {
                        btnElement.querySelector("svg use").setAttribute("xlink:href", "#iconPin");
                        btnElement.setAttribute("aria-label", window.siyuan.languages.pin);
                    } else {
                        btnElement.querySelector("svg use").setAttribute("xlink:href", "#iconUnpin");
                        btnElement.setAttribute("aria-label", window.siyuan.languages.unpin);
                    }
                    break;
                case "refresh":
                    btnElement.classList.toggle("block__icon--active");
                    break;
                case "before":
                    insertEmptyBlock(protyle, "beforebegin", id);
                    hideElements(["util"], protyle);
                    break;
                case "after":
                    insertEmptyBlock(protyle, "afterend", id);
                    hideElements(["util"], protyle);
                    break;
                case "export":
                    exportImg();
                    break;
            }
        });
        const exportImg = () => {
            const msgId = showMessage(window.siyuan.languages.exporting, 0);
            if (renderElement.getAttribute("data-subtype") === "plantuml") {
                fetch(renderElement.querySelector("object").getAttribute("data")).then(function (response) {
                    return response.blob();
                }).then(function (blob) {
                    const formData = new FormData();
                    formData.append("file", blob);
                    formData.append("type", "image/svg+xml");
                    fetchPost("/api/export/exportAsFile", formData, (response) => {
                        openByMobile(response.data.file);
                        hideMessage(msgId);
                    });
                });
                return;
            }
            setTimeout(() => {
                addScript("/stage/protyle/js/html-to-image.min.js?v=1.11.13", "protyleHtml2image").then(() => {
                    (renderElement as HTMLHtmlElement).style.display = "inline-block";
                    window.htmlToImage.toBlob(renderElement).then(blob => {
                        (renderElement as HTMLHtmlElement).style.display = "";
                        const formData = new FormData();
                        formData.append("file", blob);
                        formData.append("type", "image/png");
                        fetchPost("/api/export/exportAsFile", formData, (response) => {
                            openByMobile(response.data.file);
                            hideMessage(msgId);
                        });
                    });
                });
            }, Constants.TIMEOUT_LOAD);
        };
        const textElement = this.subElement.querySelector(".b3-text-field") as HTMLTextAreaElement;
        if (types.includes("NodeHTMLBlock")) {
            textElement.value = Lute.UnEscapeHTMLStr(renderElement.querySelector("protyle-html").getAttribute("data-content") || "");
        } else if (isInlineMemo) {
            textElement.value = Lute.UnEscapeHTMLStr(renderElement.getAttribute("data-inline-memo-content") || "");
        } else {
            textElement.value = Lute.UnEscapeHTMLStr(renderElement.getAttribute("data-content") || "");
        }
        const oldTextValue = textElement.value;
        textElement.addEventListener("input", (event) => {
            if (!renderElement.parentElement) {
                return;
            }
            if (textElement.clientHeight !== textElement.scrollHeight) {
                autoHeight();
            }
            if (!this.subElement.querySelector('[data-type="refresh"]').classList.contains("block__icon--active")) {
                return;
            }
            if (types.includes("NodeHTMLBlock")) {
                renderElement.querySelector("protyle-html").setAttribute("data-content", Lute.EscapeHTMLStr(textElement.value));
            } else if (isInlineMemo) {
                let inlineMemoElements;
                if (updateElements) {
                    inlineMemoElements = updateElements;
                } else {
                    inlineMemoElements = [renderElement];
                }
                inlineMemoElements.forEach((item) => {
                    if (item.nodeType !== 3) {
                        item.setAttribute("data-inline-memo-content", window.DOMPurify.sanitize(textElement.value));
                    }
                });
            } else {
                renderElement.setAttribute("data-content", Lute.EscapeHTMLStr(textElement.value));
                renderElement.removeAttribute("data-render");
            }
            if (!types.includes("NodeBlockQueryEmbed") || !types.includes("NodeHTMLBlock") || !isInlineMemo) {
                processRender(renderElement);
            }
            event.stopPropagation();
        });
        textElement.addEventListener("keydown", (event: KeyboardEvent) => {
            event.stopPropagation();
            // 阻止 ctrl+m 缩小窗口 https://github.com/siyuan-note/siyuan/issues/5541
            if (matchHotKey(window.siyuan.config.keymap.editor.insert["inline-math"].custom, event)) {
                event.preventDefault();
                return;
            }
            if (event.isComposing) {
                return;
            }
            if (event.key === "Escape" || matchHotKey("⌘↩", event)) {
                this.subElement.querySelector('[data-type="pin"]').setAttribute("aria-label", window.siyuan.languages.pin);
                hideElements(["util"], protyle);
            } else if (event.key === "Tab") {
                // https://github.com/siyuan-note/siyuan/issues/5270
                document.execCommand("insertText", false, "\t");
                event.preventDefault();
            } else if (electronUndo(event)) {
                return;
            }
        });
        this.subElementCloseCB = () => {
            if (!renderElement.parentElement || protyle.disabled ||
                (oldTextValue === textElement.value && textElement.value)) {
                return;
            }
            let inlineLastNode: Element;
            if (types.includes("NodeHTMLBlock")) {
                let htmlText = textElement.value;
                if (htmlText) {
                    // 需移除首尾的空白字符与连续的换行 (空行) https://github.com/siyuan-note/siyuan/issues/7921
                    htmlText = htmlText.trim().replace(/\n+/g, "\n");
                    // 需一对 div 标签包裹，否则行内元素会解析错误 https://github.com/siyuan-note/siyuan/issues/6764
                    if (!(htmlText.startsWith("<div>") && htmlText.endsWith("</div>"))) {
                        htmlText = `<div>\n${htmlText}\n</div>`;
                    }
                }
                renderElement.querySelector("protyle-html").setAttribute("data-content", Lute.EscapeHTMLStr(htmlText));
            } else if (isInlineMemo) {
                let inlineMemoElements;
                if (updateElements) {
                    inlineMemoElements = updateElements;
                } else {
                    inlineMemoElements = [renderElement];
                }
                inlineMemoElements.forEach((item, index) => {
                    if (!textElement.value) {
                        // https://github.com/siyuan-note/insider/issues/1046
                        const currentTypes = item.getAttribute("data-type").split(" ");
                        if (currentTypes.length === 1 && currentTypes[0] === "inline-memo") {
                            item.outerHTML = item.innerHTML + (index === inlineMemoElements.length - 1 ? "<wbr>" : "");
                        } else {
                            currentTypes.find((typeItem, index) => {
                                if (typeItem === "inline-memo") {
                                    currentTypes.splice(index, 1);
                                    return true;
                                }
                            });
                            item.setAttribute("data-type", currentTypes.join(" "));
                            item.removeAttribute("data-inline-memo-content");
                        }
                        if (index === inlineMemoElements.length - 1) {
                            inlineLastNode = item;
                        }
                    } else if (item.nodeType !== 3) {
                        // 行级备注自动移除换行  https://ld246.com/article/1664205917326
                        item.setAttribute("data-inline-memo-content", window.DOMPurify.sanitize(textElement.value));
                    }
                });
            } else if (types.includes("inline-math")) {
                // 行内数学公式不允许换行 https://github.com/siyuan-note/siyuan/issues/2187
                if (textElement.value) {
                    renderElement.setAttribute("data-content", Lute.EscapeHTMLStr(textElement.value));
                    renderElement.removeAttribute("data-render");
                    processRender(renderElement);
                } else {
                    inlineLastNode = renderElement;
                    // esc 后需要 focus range，但点击空白处不能 focus range，否则光标无法留在点击位置
                    renderElement.outerHTML = "<wbr>";
                }
            } else {
                renderElement.setAttribute("data-content", Lute.EscapeHTMLStr(textElement.value));
                renderElement.removeAttribute("data-render");
                if (types.includes("NodeBlockQueryEmbed")) {
                    blockRender(protyle, renderElement);
                    (renderElement as HTMLElement).style.height = "";
                } else {
                    processRender(renderElement);
                }
            }

            // 光标定位
            if (getSelection().rangeCount === 0 ||
                // $$ 中间输入后再 ESC 光标无法定位
                (getSelection().rangeCount > 0 && hasClosestByClassName(getSelection().getRangeAt(0).startContainer, "protyle-util"))
            ) {  // https://ld246.com/article/1665306093005
                if (renderElement.tagName === "SPAN") {
                    if (inlineLastNode) {
                        if (inlineLastNode.parentElement) {
                            this.range.setStartAfter(inlineLastNode);
                            this.range.collapse(true);
                            focusByRange(this.range);
                        } else {
                            focusByWbr(nodeElement, this.range);
                        }
                    } else if (renderElement.parentElement) {
                        this.range.setStartAfter(renderElement);
                        this.range.collapse(true);
                        focusByRange(this.range);
                    }
                } else {
                    focusBlock(renderElement);
                    renderElement.classList.add("protyle-wysiwyg--select");
                }
            } else {
                // ctrl+M 后点击空白会留下 wbr
                nodeElement.querySelector("wbr")?.remove();
            }

            nodeElement.setAttribute("updated", dayjs().format("YYYYMMDDHHmmss"));
            // HTML 块中包含多个 <pre> 时只能保存第一个 https://github.com/siyuan-note/siyuan/issues/5732
            if (types.includes("NodeHTMLBlock")) {
                const tempElement = document.createElement("template");
                tempElement.innerHTML = protyle.lute.SpinBlockDOM(nodeElement.outerHTML);
                if (tempElement.content.childElementCount > 1) {
                    showMessage(window.siyuan.languages.htmlBlockTip);
                }
            }
            updateTransaction(protyle, id, nodeElement.outerHTML, html);
        };
        this.subElement.style.zIndex = (++window.siyuan.zIndex).toString();
        this.subElement.classList.remove("fn__none");
        const nodeRect = renderElement.getBoundingClientRect();
        this.element.classList.add("fn__none");
        if (isPin) {
            textElement.style.width = pinData.styleW;
            textElement.style.height = pinData.styleH;
        } else {
            autoHeight();
        }
        if (!protyle.disabled) {
            textElement.select();
        }
        protyle.app.plugins.forEach(item => {
            item.eventBus.emit("open-noneditableblock", {
                protyle,
                toolbar: this,
                blockElement: nodeElement,
                renderElement,
            });
        });
    }

    public showCodeLanguage(protyle: IProtyle, languageElements: HTMLElement[]) {
        const nodeElement = hasClosestBlock(languageElements[0]);
        if (!nodeElement) {
            return;
        }
        hideElements(["hint"], protyle);
        window.siyuan.menus.menu.remove();
        this.range = getEditorRange(nodeElement);
        let html = `<div class="b3-list-item">${window.siyuan.languages.clear}</div>`;
        const hljsLanguages = Constants.ALIAS_CODE_LANGUAGES.concat(window.hljs?.listLanguages() ?? []).sort();
        hljsLanguages.forEach((item, index) => {
            html += `<div class="b3-list-item${index === 0 ? " b3-list-item--focus" : ""}">${item}</div>`;
        });

        this.subElement.style.width = "";
        this.subElement.style.padding = "";
        this.subElement.innerHTML = `<div class="fn__flex-column" style="max-height:50vh">
    <input placeholder="${window.siyuan.languages.search}" style="margin: 0 8px 4px 8px" class="b3-text-field"/>
    <div class="b3-list fn__flex-1 b3-list--background" style="position: relative">${html}</div>
</div>`;

        const listElement = this.subElement.lastElementChild.lastElementChild as HTMLElement;
        const inputElement = this.subElement.querySelector("input");
        inputElement.addEventListener("keydown", (event: KeyboardEvent) => {
            event.stopPropagation();
            if (event.isComposing) {
                return;
            }
            upDownHint(listElement, event);
            if (event.key === "Enter") {
                this.updateLanguage(languageElements, protyle, this.subElement.querySelector(".b3-list-item--focus").textContent);
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            if (event.key === "Escape") {
                this.subElement.classList.add("fn__none");
                focusByRange(this.range);
            }
        });
        inputElement.addEventListener("input", (event) => {
            const lowerCaseValue = inputElement.value.toLowerCase();
            const matchLanguages = hljsLanguages.filter(item => item.includes(lowerCaseValue));
            let html = "";
            // sort
            let matchInput = false;
            matchLanguages.sort((a, b) => {
                if (a.startsWith(lowerCaseValue) && b.startsWith(lowerCaseValue)) {
                    if (a.length < b.length) {
                        return -1;
                    } else if (a.length === b.length) {
                        return 0;
                    } else {
                        return 1;
                    }
                } else if (a.startsWith(lowerCaseValue)) {
                    return -1;
                } else if (b.startsWith(lowerCaseValue)) {
                    return 1;
                } else {
                    return 0;
                }
            }).forEach((item) => {
                if (inputElement.value === item) {
                    matchInput = true;
                }
                html += `<div class="b3-list-item">${item.replace(lowerCaseValue, "<b>" + lowerCaseValue + "</b>")}</div>`;
            });
            if (inputElement.value.trim() && !matchInput) {
                html = `<div class="b3-list-item"><b>${escapeHtml(inputElement.value.replace(/`| /g, "_"))}</b></div>${html}`;
            }
            html = `<div class="b3-list-item">${window.siyuan.languages.clear}</div>` + html;
            listElement.innerHTML = html;
            if (listElement.firstElementChild.nextElementSibling) {
                listElement.firstElementChild.nextElementSibling.classList.add("b3-list-item--focus");
            } else {
                listElement.firstElementChild.classList.add("b3-list-item--focus");
            }
            event.stopPropagation();
        });
        listElement.addEventListener("click", (event) => {
            const target = event.target as HTMLElement;
            const listElement = hasClosestByClassName(target, "b3-list-item");
            if (!listElement) {
                return;
            }
            this.updateLanguage(languageElements, protyle, listElement.textContent);
        });
        this.subElement.style.zIndex = (++window.siyuan.zIndex).toString();
        this.subElement.classList.remove("fn__none");
        this.subElementCloseCB = undefined;
        /// #if !MOBILE
        const nodeRect = languageElements[0].getBoundingClientRect();
        setPosition(this.subElement, nodeRect.left, nodeRect.bottom, nodeRect.height);
        /// #else
        setPosition(this.subElement, 0, 0);
        /// #endif
        this.element.classList.add("fn__none");
        inputElement.select();
    }

    public showTpl(protyle: IProtyle, nodeElement: HTMLElement, range: Range) {
        this.range = range;
        hideElements(["hint"], protyle);
        window.siyuan.menus.menu.remove();
        this.subElement.style.width = "";
        this.subElement.style.padding = "";
        this.subElement.innerHTML = `<div style="max-height:50vh" class="fn__flex">
<div class="fn__flex-column" style="${isMobile() ? "width: 100%" : "width: 256px"}">
    <div class="fn__flex" style="margin: 0 8px 4px 8px">
        <input class="b3-text-field fn__flex-1"/>
        <span class="fn__space"></span>
        <span data-type="previous" class="block__icon block__icon--show"><svg><use xlink:href="#iconLeft"></use></svg></span>
        <span class="fn__space"></span>
        <span data-type="next" class="block__icon block__icon--show"><svg><use xlink:href="#iconRight"></use></svg></span>
    </div>
    <div class="b3-list fn__flex-1 b3-list--background" style="position: relative"><img style="margin: 0 auto;display: block;width: 64px;height: 64px" src="/stage/loading-pure.svg"></div>
</div>
<div class="toolbarResize" style="    cursor: col-resize;
    box-shadow: 2px 0 0 0 var(--b3-theme-surface) inset, 3px 0 0 0 var(--b3-border-color) inset;
    width: 5px;
    margin-left: -2px;"></div>
<div style="width: 520px;${isMobile() || window.outerWidth < window.outerWidth / 2 + 520 ? "display:none;" : ""}overflow: auto;"></div>
</div>`;
        const listElement = this.subElement.querySelector(".b3-list");
        resizeSide(this.subElement.querySelector(".toolbarResize"), listElement.parentElement);
        const previewElement = this.subElement.firstElementChild.lastElementChild;
        let previewPath: string;
        listElement.addEventListener("mouseover", (event) => {
            const target = event.target as HTMLElement;
            const hoverItemElement = hasClosestByClassName(target, "b3-list-item");
            if (!hoverItemElement) {
                return;
            }
            const currentPath = hoverItemElement.getAttribute("data-value");
            if (previewPath === currentPath) {
                return;
            }
            previewPath = currentPath;
            previewTemplate(previewPath, previewElement, protyle.block.parentID);
            event.stopPropagation();
        });
        const inputElement = this.subElement.querySelector("input");
        inputElement.addEventListener("keydown", (event: KeyboardEvent) => {
            event.stopPropagation();
            if (event.isComposing) {
                return;
            }
            const isEmpty = !this.subElement.querySelector(".b3-list-item");
            if (!isEmpty) {
                const currentElement = upDownHint(listElement, event);
                if (currentElement) {
                    const currentPath = currentElement.getAttribute("data-value");
                    if (previewPath === currentPath) {
                        return;
                    }
                    previewPath = currentPath;
                    previewTemplate(previewPath, previewElement, protyle.block.parentID);
                }
            }
            if (event.key === "Enter") {
                if (!isEmpty) {
                    hintRenderTemplate(decodeURIComponent(this.subElement.querySelector(".b3-list-item--focus").getAttribute("data-value")), protyle, nodeElement);
                } else {
                    focusByRange(this.range);
                }
                this.subElement.classList.add("fn__none");
                event.preventDefault();
            } else if (event.key === "Escape") {
                this.subElement.classList.add("fn__none");
                focusByRange(this.range);
            }
        });
        inputElement.addEventListener("input", (event) => {
            event.stopPropagation();
            fetchPost("/api/search/searchTemplate", {
                k: inputElement.value,
            }, (response) => {
                let searchHTML = "";
                response.data.blocks.forEach((item: { path: string, content: string }, index: number) => {
                    searchHTML += `<div data-value="${item.path}" class="b3-list-item${index === 0 ? " b3-list-item--focus" : ""}">${item.content}</div>`;
                });
                listElement.innerHTML = searchHTML || `<li class="b3-list--empty">${window.siyuan.languages.emptyContent}</li>`;
                const currentPath = response.data.blocks[0]?.path;
                if (previewPath === currentPath) {
                    return;
                }
                previewPath = currentPath;
                previewTemplate(previewPath, previewElement, protyle.block.parentID);
            });
        });
        this.subElement.lastElementChild.addEventListener("click", (event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("b3-list--empty")) {
                this.subElement.classList.add("fn__none");
                focusByRange(this.range);
                event.stopPropagation();
                return;
            }
            const iconElement = hasClosestByClassName(target, "b3-list-item__action");
            /// #if !BROWSER
            if (iconElement && iconElement.getAttribute("data-type") === "open") {
                openBy(iconElement.parentElement.getAttribute("data-value"), "folder");
                event.stopPropagation();
                return;
            }
            /// #endif
            if (iconElement && iconElement.getAttribute("data-type") === "remove") {
                confirmDialog(window.siyuan.languages.remove, window.siyuan.languages.confirmDelete + "?", () => {
                    fetchPost("/api/search/removeTemplate", {path: iconElement.parentElement.getAttribute("data-value")}, () => {
                        if (iconElement.parentElement.parentElement.childElementCount === 1) {
                            iconElement.parentElement.parentElement.innerHTML = `<li class="b3-list--empty">${window.siyuan.languages.emptyContent}</li>`;
                            previewTemplate("", previewElement, protyle.block.parentID);
                        } else {
                            if (iconElement.parentElement.classList.contains("b3-list-item--focus")) {
                                const sideElement = iconElement.parentElement.previousElementSibling || iconElement.parentElement.nextElementSibling;
                                sideElement.classList.add("b3-list-item--focus");
                                const currentPath = sideElement.getAttribute("data-value");
                                if (previewPath === currentPath) {
                                    return;
                                }
                                previewPath = currentPath;
                                previewTemplate(previewPath, previewElement, protyle.block.parentID);
                            }
                            iconElement.parentElement.remove();
                        }
                    });
                });
                event.stopPropagation();
                return;
            }
            const previousElement = hasClosestByAttribute(target, "data-type", "previous");
            if (previousElement) {
                inputElement.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowUp"}));
                event.stopPropagation();
                return;
            }
            const nextElement = hasClosestByAttribute(target, "data-type", "next");
            if (nextElement) {
                inputElement.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowDown"}));
                event.stopPropagation();
                return;
            }
            const listElement = hasClosestByClassName(target, "b3-list-item");
            if (listElement) {
                hintRenderTemplate(decodeURIComponent(listElement.getAttribute("data-value")), protyle, nodeElement);
                event.stopPropagation();
            }
        });
        this.subElement.style.zIndex = (++window.siyuan.zIndex).toString();
        this.subElement.classList.remove("fn__none");
        this.subElementCloseCB = undefined;
        this.element.classList.add("fn__none");
        inputElement.select();
        fetchPost("/api/search/searchTemplate", {
            k: "",
        }, (response) => {
            let html = "";
            response.data.blocks.forEach((item: { path: string, content: string }, index: number) => {
                html += `<div data-value="${item.path}" class="b3-list-item--hide-action b3-list-item${index === 0 ? " b3-list-item--focus" : ""}">
<span class="b3-list-item__text">${item.content}</span>`;
                /// #if !BROWSER
                html += `<span data-type="open" class="b3-list-item__action b3-tooltips b3-tooltips__w" aria-label="${window.siyuan.languages.showInFolder}">
    <svg><use xlink:href="#iconFolder"></use></svg>
</span>`;
                /// #endif
                html += `<span data-type="remove" class="b3-list-item__action b3-tooltips b3-tooltips__w" aria-label="${window.siyuan.languages.remove}">
    <svg><use xlink:href="#iconTrashcan"></use></svg>
</span></div>`;
            });
            this.subElement.querySelector(".b3-list--background").innerHTML = html || `<li class="b3-list--empty">${window.siyuan.languages.emptyContent}</li>`;
            /// #if !MOBILE
            const rangePosition = getSelectionPosition(nodeElement, range);
            setPosition(this.subElement, rangePosition.left, rangePosition.top + 18, Constants.SIZE_TOOLBAR_HEIGHT);
            (this.subElement.firstElementChild as HTMLElement).style.maxHeight = Math.min(window.innerHeight * 0.8, window.innerHeight - this.subElement.getBoundingClientRect().top) - 16 + "px";
            /// #else
            setPosition(this.subElement, 0, 0);
            /// #endif
            previewPath = listElement.firstElementChild.getAttribute("data-value");
            previewTemplate(previewPath, previewElement, protyle.block.parentID);
        });
    }

    public showWidget(protyle: IProtyle, nodeElement: HTMLElement, range: Range) {
        this.range = range;
        hideElements(["hint"], protyle);
        window.siyuan.menus.menu.remove();
        this.subElement.style.width = "";
        this.subElement.style.padding = "";
        this.subElement.innerHTML = `<div class="fn__flex-column" style="max-height:50vh">
    <input style="margin: 0 8px 4px 8px" class="b3-text-field"/>
    <div class="b3-list fn__flex-1 b3-list--background" style="position: relative"><img style="margin: 0 auto;display: block;width: 64px;height:64px" src="/stage/loading-pure.svg"></div>
</div>`;
        const listElement = this.subElement.lastElementChild.lastElementChild as HTMLElement;
        const inputElement = this.subElement.querySelector("input");
        inputElement.addEventListener("keydown", (event: KeyboardEvent) => {
            event.stopPropagation();
            if (event.isComposing) {
                return;
            }
            upDownHint(listElement, event);
            if (event.key === "Enter") {
                hintRenderWidget(this.subElement.querySelector(".b3-list-item--focus").getAttribute("data-content"), protyle);
                this.subElement.classList.add("fn__none");
                event.preventDefault();
            } else if (event.key === "Escape") {
                this.subElement.classList.add("fn__none");
                focusByRange(this.range);
            }
        });
        inputElement.addEventListener("input", (event) => {
            event.stopPropagation();
            fetchPost("/api/search/searchWidget", {
                k: inputElement.value,
            }, (response) => {
                let searchHTML = "";
                response.data.blocks.forEach((item: { path: string, content: string, name: string }, index: number) => {
                    searchHTML += `<div data-value="${item.path}" data-content="${item.content}" class="b3-list-item${index === 0 ? " b3-list-item--focus" : ""}">
    ${item.name}
    <span class="b3-list-item__meta">${item.content}</span>
</div>`;
                });
                listElement.innerHTML = searchHTML;
            });
        });
        this.subElement.lastElementChild.addEventListener("click", (event) => {
            const target = event.target as HTMLElement;
            const listElement = hasClosestByClassName(target, "b3-list-item");
            if (!listElement) {
                return;
            }
            hintRenderWidget(listElement.dataset.content, protyle);
        });
        this.subElement.style.zIndex = (++window.siyuan.zIndex).toString();
        this.subElement.classList.remove("fn__none");
        this.subElementCloseCB = undefined;
        this.element.classList.add("fn__none");
        inputElement.select();
        fetchPost("/api/search/searchWidget", {
            k: "",
        }, (response) => {
            let html = "";
            response.data.blocks.forEach((item: { content: string, name: string }, index: number) => {
                html += `<div class="b3-list-item${index === 0 ? " b3-list-item--focus" : ""}" data-content="${item.content}">
${item.name}
<span class="b3-list-item__meta">${item.content}</span>
</div>`;
            });
            this.subElement.querySelector(".b3-list--background").innerHTML = html;
            /// #if !MOBILE
            const rangePosition = getSelectionPosition(nodeElement, range);
            setPosition(this.subElement, rangePosition.left, rangePosition.top + 18, Constants.SIZE_TOOLBAR_HEIGHT);
            /// #else
            setPosition(this.subElement, 0, 0);
            /// #endif
        });
    }

    public showContent(protyle: IProtyle, range: Range, nodeElement: Element) {
        this.range = range;
        hideElements(["hint"], protyle);

        this.subElement.style.width = "auto";
        this.subElement.style.padding = "0 8px";
        let html = "";
        const hasCopy = range.toString() !== "" || (range.cloneContents().childNodes[0] as HTMLElement)?.classList?.contains("emoji");
        if (hasCopy) {
            html += '<button class="keyboard__action" data-action="copy"><svg><use xlink:href="#iconCopy"></use></svg></button>';
            if (!protyle.disabled) {
                html += `<button class="keyboard__action" data-action="cut"><svg><use xlink:href="#iconCut"></use></svg></button>
<button class="keyboard__action" data-action="delete"><svg><use xlink:href="#iconTrashcan"></use></svg></button>`;
            }
        }
        if (!protyle.disabled) {
            html += `<button class="keyboard__action" data-action="paste"><svg><use xlink:href="#iconPaste"></use></svg></button>
<button class="keyboard__action" data-action="select"><svg><use xlink:href="#iconSelect"></use></svg></button>`;
        }
        if (hasCopy || !protyle.disabled) {
            html += "<button class=\"keyboard__action\" data-action=\"more\"><svg><use xlink:href=\"#iconMore\"></use></svg></button>";
        }
        this.subElement.innerHTML = `<div class="fn__flex">${html}</div>`;
        this.subElement.lastElementChild.addEventListener("click", async (event) => {
            const btnElemen = hasClosestByClassName(event.target as HTMLElement, "keyboard__action");
            if (!btnElemen) {
                return;
            }
            const action = btnElemen.getAttribute("data-action");
            if (action === "copy") {
                focusByRange(getEditorRange(nodeElement));
                document.execCommand("copy");
                this.subElement.classList.add("fn__none");
            } else if (action === "cut") {
                focusByRange(getEditorRange(nodeElement));
                document.execCommand("cut");
                this.subElement.classList.add("fn__none");
            } else if (action === "delete") {
                const currentRange = getEditorRange(nodeElement);
                currentRange.insertNode(document.createElement("wbr"));
                const oldHTML = nodeElement.outerHTML;
                currentRange.extractContents();
                focusByWbr(nodeElement, currentRange);
                focusByRange(currentRange);
                updateTransaction(protyle, nodeElement.getAttribute("data-node-id"), nodeElement.outerHTML, oldHTML);
                this.subElement.classList.add("fn__none");
            } else if (action === "paste") {
                if (document.queryCommandSupported("paste")) {
                    document.execCommand("paste");
                } else {
                    try {
                        const text = await readClipboard();
                        paste(protyle, Object.assign(text, {target: nodeElement as HTMLElement}));
                    } catch (e) {
                        console.log(e);
                    }
                }
                this.subElement.classList.add("fn__none");
            } else if (action === "select") {
                selectAll(protyle, nodeElement, range);
                this.subElement.classList.add("fn__none");
            } else if (action === "copyPlainText") {
                focusByRange(getEditorRange(nodeElement));
                copyPlainText(getSelection().getRangeAt(0).toString());
                this.subElement.classList.add("fn__none");
            } else if (action === "pasteAsPlainText") {
                focusByRange(getEditorRange(nodeElement));
                pasteAsPlainText(protyle);
                this.subElement.classList.add("fn__none");
            } else if (action === "pasteEscaped") {
                pasteEscaped(protyle, nodeElement);
                this.subElement.classList.add("fn__none");
            } else if (action === "back") {
                this.subElement.lastElementChild.innerHTML = html;
            } else if (action === "more") {
                this.subElement.lastElementChild.innerHTML = `<button class="keyboard__action${hasCopy ? "" : " fn__none"}" data-action="copyPlainText"><span>${window.siyuan.languages.copyPlainText}</span></button>
<div class="keyboard__split${hasCopy ? "" : " fn__none"}"></div>
<button class="keyboard__action${protyle.disabled ? " fn__none" : ""}" data-action="pasteAsPlainText"><span>${window.siyuan.languages.pasteAsPlainText}</span></button>
<div class="keyboard__split${protyle.disabled ? " fn__none" : ""}"></div>
<button class="keyboard__action${protyle.disabled ? " fn__none" : ""}" data-action="pasteEscaped"><span>${window.siyuan.languages.pasteEscaped}</span></button>
<div class="keyboard__split${protyle.disabled ? " fn__none" : ""}"></div>
<button class="keyboard__action" data-action="back"><svg><use xlink:href="#iconBack"></use></svg></button>`;
                setPosition(this.subElement, rangePosition.left, rangePosition.top + 28, Constants.SIZE_TOOLBAR_HEIGHT);
            }
        });
        this.subElement.style.zIndex = (++window.siyuan.zIndex).toString();
        this.subElement.classList.remove("fn__none");
        this.subElementCloseCB = undefined;
        this.element.classList.add("fn__none");
        const rangePosition = getSelectionPosition(nodeElement, range);
        setPosition(this.subElement, rangePosition.left, rangePosition.top - 48, Constants.SIZE_TOOLBAR_HEIGHT);
    }

    private genItem(protyle: IProtyle, menuItem: IMenuItem) {
        let menuItemObj;
        switch (menuItem.name) {
            case "strong":
            case "em":
            case "s":
            case "code":
            case "mark":
            case "tag":
            case "u":
            case "sup":
            case "clear":
            case "sub":
            case "kbd":
                menuItemObj = new ToolbarItem(protyle, menuItem);
                break;
            case "block-ref":
                menuItemObj = new BlockRef(protyle, menuItem);
                break;
            case "inline-math":
                menuItemObj = new InlineMath(protyle, menuItem);
                break;
            case "inline-memo":
                menuItemObj = new InlineMemo(protyle, menuItem);
                break;
            case "|":
                menuItemObj = new Divider();
                break;
            case "text":
                menuItemObj = new Font(protyle, menuItem);
                break;
            case "a":
                menuItemObj = new Link(protyle, menuItem);
                break;
            default:
                menuItemObj = new ToolbarItem(protyle, menuItem);
                break;
        }
        if (!menuItemObj) {
            return;
        }
        return menuItemObj.element;
    }

    // 合并多个 text 为一个 text
    private mergeNode(nodes: NodeListOf<ChildNode>) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].nodeType !== 3 && (nodes[i] as HTMLElement).tagName === "WBR") {
                nodes[i].remove();
                i--;
            }
        }
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].nodeType === 3) {
                if (nodes[i].textContent === "") {
                    nodes[i].remove();
                    i--;
                } else if (nodes[i + 1] && nodes[i + 1].nodeType === 3) {
                    nodes[i].textContent = nodes[i].textContent + nodes[i + 1].textContent;
                    nodes[i + 1].remove();
                    i--;
                }
            }
        }
    }

    private updateLanguage(languageElement: HTMLElement[], protyle: IProtyle, selectedLang: string) {
        const currentLang = selectedLang === window.siyuan.languages.clear ? "" : selectedLang;
        if (!Constants.SIYUAN_RENDER_CODE_LANGUAGES.includes(currentLang)) {
            window.siyuan.storage[Constants.LOCAL_CODELANG] = currentLang;
            setStorageVal(Constants.LOCAL_CODELANG, window.siyuan.storage[Constants.LOCAL_CODELANG]);
        }
        const doOperations: IOperation[] = [];
        const undoOperations: IOperation[] = [];
        languageElement.forEach(item => {
            const nodeElement = hasClosestBlock(item);
            if (nodeElement) {
                const id = nodeElement.getAttribute("data-node-id");
                undoOperations.push({
                    id,
                    data: nodeElement.outerHTML,
                    action: "update"
                });
                item.textContent = selectedLang === window.siyuan.languages.clear ? "" : selectedLang;
                const editElement = getContenteditableElement(nodeElement);
                if (Constants.SIYUAN_RENDER_CODE_LANGUAGES.includes(currentLang)) {
                    nodeElement.dataset.content = editElement.textContent.trim();
                    nodeElement.dataset.subtype = currentLang;
                    nodeElement.className = "render-node";
                    nodeElement.innerHTML = `<div spin="1"></div><div class="protyle-attr" contenteditable="false">${Constants.ZWSP}</div>`;
                    processRender(nodeElement);
                } else {
                    (editElement as HTMLElement).textContent = editElement.textContent;
                    editElement.parentElement.removeAttribute("data-render");
                    highlightRender(nodeElement);
                }
                nodeElement.setAttribute("updated", dayjs().format("YYYYMMDDHHmmss"));
                doOperations.push({
                    id,
                    data: nodeElement.outerHTML,
                    action: "update"
                });
            }
        });
        transaction(protyle, doOperations, undoOperations);
        this.subElement.classList.add("fn__none");
        focusByRange(this.range);
    }
}

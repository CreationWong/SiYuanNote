type TPluginDockPosition = "LeftTop" | "LeftBottom" | "RightTop" | "RightBottom" | "BottomLeft" | "BottomRight"
type TDockPosition = "Left" | "Right" | "Bottom"
type TWS = "main" | "filetree" | "protyle"
type TDock = "file" | "outline" | "inbox" | "bookmark" | "tag" | "graph" | "globalGraph" | "backlink"
type TOperation =
    "insert"
    | "update"
    | "delete"
    | "move"
    | "foldHeading"
    | "unfoldHeading"
    | "setAttrs"
    | "updateAttrs"
    | "append"
    | "insertAttrViewBlock"
    | "removeAttrViewBlock"
    | "addAttrViewCol"
    | "removeAttrViewCol"
    | "addFlashcards"
    | "removeFlashcards"
    | "updateAttrViewCell"
    | "updateAttrViewCol"
    | "updateAttrViewColTemplate"
    | "sortAttrViewRow"
    | "sortAttrViewCol"
    | "sortAttrViewKey"
    | "setAttrViewColPin"
    | "setAttrViewColHidden"
    | "setAttrViewColWrap"
    | "setAttrViewColWidth"
    | "updateAttrViewColOptions"
    | "removeAttrViewColOption"
    | "updateAttrViewColOption"
    | "setAttrViewName"
    | "doUpdateUpdated"
    | "duplicateAttrViewKey"
    | "setAttrViewColIcon"
    | "setAttrViewFilters"
    | "setAttrViewSorts"
    | "setAttrViewColCalc"
    | "updateAttrViewColNumberFormat"
    | "replaceAttrViewBlock"
    | "addAttrViewView"
    | "setAttrViewViewName"
    | "removeAttrViewView"
    | "setAttrViewViewIcon"
    | "duplicateAttrViewView"
    | "sortAttrViewView"
    | "setAttrViewPageSize"
    | "updateAttrViewColRelation"
    | "moveOutlineHeading"
    | "updateAttrViewColRollup"
    | "hideAttrViewName"
    | "setAttrViewCardSize"
    | "setAttrViewCardAspectRatio"
    | "setAttrViewCoverFrom"
    | "setAttrViewCoverFromAssetKeyID"
    | "setAttrViewFitImage"
    | "setAttrViewShowIcon"
    | "setAttrViewWrapField"
    | "setAttrViewColDate"
    | "unbindAttrViewBlock"
    | "setAttrViewViewDesc"
    | "setAttrViewColDesc"
    | "setAttrViewBlockView"
    | "setAttrViewGroup"
    | "syncAttrViewTableColWidth"
type TBazaarType = "templates" | "icons" | "widgets" | "themes" | "plugins"
type TCardType = "doc" | "notebook" | "all"
type TEventBus = "ws-main" | "sync-start" | "sync-end" | "sync-fail" |
    "click-blockicon" | "click-editorcontent" | "click-pdf" | "click-editortitleicon" | "click-flashcard-action" |
    "open-noneditableblock" |
    "open-menu-blockref" | "open-menu-fileannotationref" | "open-menu-tag" | "open-menu-link" | "open-menu-image" |
    "open-menu-av" | "open-menu-content" | "open-menu-breadcrumbmore" | "open-menu-doctree" | "open-menu-inbox" |
    "open-siyuan-url-plugin" | "open-siyuan-url-block" | "opened-notebook" |
    "closed-notebook" |
    "paste" |
    "input-search" |
    "loaded-protyle-dynamic" | "loaded-protyle-static" |
    "switch-protyle" |
    "destroy-protyle" |
    "lock-screen" |
    "mobile-keyboard-show" | "mobile-keyboard-hide"
type TAVView = "table" | "gallery"
type TAVCol =
    "text"
    | "date"
    | "number"
    | "relation"
    | "rollup"
    | "select"
    | "block"
    | "mSelect"
    | "url"
    | "email"
    | "phone"
    | "mAsset"
    | "template"
    | "created"
    | "updated"
    | "checkbox"
    | "lineNumber"
type THintSource = "search" | "av" | "hint";
type TAVFilterOperator =
    "="
    | "!="
    | ">"
    | ">="
    | "<"
    | "<="
    | "Contains"
    | "Does not contains"
    | "Is empty"
    | "Is not empty"
    | "Starts with"
    | "Ends with"
    | "Is between"
    | "Is relative to today"
    | "Is true"
    | "Is false"

declare module "blueimp-md5"

declare class Highlight {
    constructor(...range: Range[]);

    add(range: Range): void

    clear(): void

    forEach(callbackfn: (value: Range, key: number) => void): void;
}

declare namespace CSS {
    const highlights: Map<string, Highlight>;
}

interface CSSStyleDeclarationElectron extends CSSStyleDeclaration {
    WebkitAppRegion: string;
}

interface Window {
    DOMPurify: {
        sanitize(dirty: string): string;
    };
    echarts: {
        init(element: Element, theme?: string, options?: {
            width: number
        }): {
            setOption(option: any): void;
            getZr(): any;
            on(name: string, event: (e: any) => void): any;
            containPixel(name: string, position: number[]): any;
            resize(): void;
        };
        dispose(element: Element): void;
        getInstanceById(id: string): {
            resize: () => void
            clear: () => void
            getOption: () => { series: { type: string }[] }
        };
    };
    ABCJS: {
        renderAbc(element: Element, text: string, options: {
            responsive: string
        }): void;
    };
    MathJax: {
        svg: {
            fontCache: string
        }
        startup?: {
            promise: Promise<void>
        }
        tex2svg?(math: string, options: { display: boolean }): HTMLElement
    };
    hljs: {
        listLanguages(): string[];
        highlight(text: string, options: {
            language?: string,
            ignoreIllegals: boolean
        }): {
            value: string
        };
        getLanguage(text: string): {
            name: string
        };
    };
    katex: {
        renderToString(math: string, option: {
            displayMode: boolean;
            output: string;
            macros: IObject;
            trust: boolean;
            strict: (errorCode: string) => "ignore" | "warn";
        }): string;
    };
    mermaid: {
        initialize(options: any): void,
        render(id: string, text: string): { svg: string }
    };
    plantumlEncoder: {
        encode(options: string): string,
    };
    pdfjsLib: any;

    dataLayer: any[];

    siyuan: ISiyuan;
    webkit: {
        messageHandlers: {
            openLink: { postMessage: (url: string) => void }
            startKernelFast: { postMessage: (url: string) => void }
            changeStatusBar: { postMessage: (url: string) => void }
            setClipboard: { postMessage: (url: string) => void }
            purchase: { postMessage: (url: string) => void }
        }
    };
    htmlToImage: {
        toCanvas: (element: Element) => Promise<HTMLCanvasElement>
        toBlob: (element: Element) => Promise<Blob>
    };
    JSAndroid: {
        returnDesktop(): void
        openExternal(url: string): void
        exportByDefault(url: string): void
        changeStatusBarColor(color: string, mode: number): void
        writeClipboard(text: string): void
        writeHTMLClipboard(text: string, html: string): void
        writeImageClipboard(uri: string): void
        readClipboard(): string
        readHTMLClipboard(): string
        getBlockURL(): string
        hideKeyboard(): void
    };
    JSHarmony: {
        openExternal(url: string): void
        exportByDefault(url: string): void
        changeStatusBarColor(color: string, mode: number): void
        writeClipboard(text: string): void
        writeHTMLClipboard(text: string, html: string): void
        readClipboard(): string
        readHTMLClipboard(): string
        returnDesktop(): void
    };

    Protyle: import("../protyle/method").default;

    goBack(): void;

    showMessage(message: string, timeout: number, type: string, messageId?: string): void;

    reconnectWebSocket(): void;

    showKeyboardToolbar(height: number): void;

    processIOSPurchaseResponse(code: number): void;

    hideKeyboardToolbar(): void;

    openFileByURL(URL: string): boolean;

    destroyTheme(): Promise<void>;
}

interface IClipboardData {
    textHTML?: string,
    textPlain?: string,
    siyuanHTML?: string,
    files?: File[],
}

interface IRefDefs {
    refID: string,
    defIDs?: string[]
}

interface IFilesPath {
    notebookId: string,
    openPaths: string[]
}

interface IPosition {
    x: number,
    y: number,
    w?: number,
    h?: number,
    isLeft?: boolean
}

interface ISaveLayout {
    name: string,
    layout: IObject
    time: number
    filesPaths: IFilesPath[]
}

interface IWorkspace {
    path: string;
    closed: boolean;
}

interface ICardPackage {
    id: string;
    updated: string;
    name: string;
    size: number;
}

interface ICard {
    deckID: string;
    cardID: string;
    blockID: string;
    nextDues: IObject;
    lapses: number;  // 遗忘次数
    lastReview: number;  // 最后复习时间
    reps: number;  // 复习次数
    state: number;   // 卡片状态 0：新卡
}

interface ICardData {
    cards: ICard[],
    unreviewedCount: number
    unreviewedNewCardCount: number
    unreviewedOldCardCount: number
}

interface IPluginSettingOption {
    title: string;
    description?: string;
    actionElement?: HTMLElement;
    direction?: "column" | "row";

    createActionElement?(): HTMLElement;
}

interface ISearchAssetOption {
    keys: string[],
    col: string,
    row: string,
    layout: number,
    method: number,
    types: {
        ".txt": boolean,
        ".md": boolean,
        ".docx": boolean,
        ".xlsx": boolean,
        ".pptx": boolean,
    },
    sort: number,
    k: string,
}

interface ITextOption {
    color?: string,
    type: string
}

interface ISnippet {
    id?: string;
    name: string;
    type: string;
    enabled: boolean;
    content: string;
}

interface IInbox {
    oId: string;
    shorthandContent: string;
    shorthandMd: string;
    shorthandDesc: string;
    shorthandFrom: number;
    shorthandTitle: string;
    shorthandURL: string;
    hCreated: string;
}

interface IPdfAnno {
    pages?: {
        index: number
        positions: number []
    }[]
    index?: number,
    color: string,
    type: string,   // border, text
    content: string,    // rect, text
    mode: string,
    id?: string,
    coords?: number[]
    ids?: string[]
}

interface IBackStack {
    id: string,
    // 仅移动端
    data?: {
        startId: string,
        endId: string
        path: string
        notebookId: string
    },
    scrollTop?: number,
    callback?: TProtyleAction[],
    position?: {
        start: number,
        end: number
    }
    // 仅桌面端
    protyle?: IProtyle,
    zoomId?: string
}

interface IEmojiItem {
    unicode: string,
    description: string,
    description_zh_cn: string,
    description_ja_jp: string,
    keywords: string
}

interface IEmoji {
    id: string,
    title: string,
    title_zh_cn: string,
    title_ja_jp: string,
    items: IEmojiItem[]
}

interface INotebook {
    name: string;
    id: string;
    closed: boolean;
    icon: string;
    sort: number;
    dueFlashcardCount?: string;
    newFlashcardCount?: string;
    flashcardCount?: string;
    sortMode: number;
}

interface ISiyuan {
    zIndex: number
    storage?: {
        [key: string]: any
    },
    transactions?: {
        protyle: IProtyle,
        doOperations: IOperation[],
        undoOperations: IOperation[]
    }[]
    reqIds: {
        [key: string]: number
    },
    editorIsFullscreen?: boolean,
    hideBreadcrumb?: boolean,
    notebooks?: INotebook[],
    emojis?: IEmoji[],
    backStack?: IBackStack[],
    mobile?: {
        editor?: import("../protyle").Protyle
        popEditor?: import("../protyle").Protyle
        docks?: {
            outline: import("../mobile/dock/MobileOutline").MobileOutline | null,
            file: import("../mobile/dock/MobileFiles").MobileFiles | null,
            bookmark: import("../mobile/dock/MobileBookmarks").MobileBookmarks | null,
            tag: import("../mobile/dock/MobileTags").MobileTags | null,
            backlink: import("../mobile/dock/MobileBacklinks").MobileBacklinks | null,
            inbox: import("../layout/dock/Inbox").Inbox | null,
        } & { [key: string]: import("../layout/Model").Model | any };
    },
    user?: {
        userId: string
        userName: string
        userAvatarURL: string
        userHomeBImgURL: string
        userIntro: string
        userNickname: string
        userSiYuanOneTimePayStatus: number  // 0 未付费；1 已付费
        userSiYuanProExpireTime: number // -1 终身会员；0 普通用户；> 0 过期时间
        userSiYuanSubscriptionPlan: number // 0 年付订阅/终生；1 教育优惠；2 订阅试用
        userSiYuanSubscriptionType: number // 0 年付；1 终生；2 月付
        userSiYuanSubscriptionStatus: number // -1：未订阅，0：订阅可用，1：订阅封禁，2：订阅过期
        userToken: string
        userTitles: {
            name: string,
            icon: string,
            desc: string
        }[]
    },
    dragElement?: HTMLElement,
    currentDragOverTabHeadersElement?: HTMLElement
    layout?: {
        layout?: import("../layout").Layout,
        centerLayout?: import("../layout").Layout,
        leftDock?: import("../layout/dock").Dock,
        rightDock?: import("../layout/dock").Dock,
        bottomDock?: import("../layout/dock").Dock,
    }
    config?: Config.IConf;
    ws: import("../layout/Model").Model,
    ctrlIsPressed?: boolean,
    altIsPressed?: boolean,
    shiftIsPressed?: boolean,
    coordinates?: {
        pageX: number,
        pageY: number,
        clientX: number,
        clientY: number,
        screenX: number,
        screenY: number,
    },
    menus?: import("../menus").Menus
    languages?: {
        [key: string]: any;
    }
    bookmarkLabel?: string[]
    blockPanels: import("../block/Panel").BlockPanel[],
    dialogs: import("../dialog").Dialog[],
    viewer?: Viewer,
    /**
     * 是否在发布服务下访问
     */
    isPublish?: boolean;
}

interface IOperation {
    action: TOperation, // move， delete 不需要传 data
    id?: string,
    blockID?: string,
    isTwoWay?: boolean, // 是否双向关联
    backRelationKeyID?: string, // 双向关联的目标关联列 ID
    avID?: string,  // av
    format?: string // updateAttrViewColNumberFormat 专享
    keyID?: string // updateAttrViewCell 专享
    rowID?: string // updateAttrViewCell 专享
    data?: any, // updateAttr 时为  { old: IObject, new: IObject }, updateAttrViewCell 时为 {TAVCol: {content: string}}
    parentID?: string
    previousID?: string
    retData?: any
    nextID?: string // insert 专享
    isDetached?: boolean // insertAttrViewBlock 专享
    ignoreFillFilter?: boolean // insertAttrViewBlock 专享
    srcIDs?: string[] // removeAttrViewBlock 专享
    srcs?: IOperationSrcs[] // insertAttrViewBlock 专享
    name?: string // addAttrViewCol 专享
    type?: TAVCol // addAttrViewCol 专享
    deckID?: string // add/removeFlashcards 专享
    blockIDs?: string[] // add/removeFlashcards 专享
    removeDest?: boolean // removeAttrViewCol 专享
    layout?: string // addAttrViewView 专享
}

interface IOperationSrcs {
    id: string,
    content?: string,
    isDetached: boolean
}


interface IObject {
    [key: string]: string;
}

interface ILayoutJSON extends ILayoutOptions {
    scrollAttr?: IScrollAttr,
    instance?: string,
    width?: string,
    height?: string,
    title?: string,
    lang?: string
    docIcon?: string
    page?: string
    path?: string
    blockId?: string
    icon?: string
    rootId?: string
    active?: boolean
    pin?: boolean
    isPreview?: boolean
    customModelData?: any
    customModelType?: string
    config?: Config.IUILayoutTabSearchConfig
    children?: ILayoutJSON[] | ILayoutJSON
}

interface ICommand {
    langKey: string, // 用于区分不同快捷键的 key, 同时作为 i18n 的字段名
    langText?: string, // 显示的文本, 指定后不再使用 langKey 对应的 i18n 文本
    hotkey: string,
    customHotkey?: string,
    callback?: () => void   // 其余回调存在时将不会触
    globalCallback?: () => void // 焦点不在应用内时执行的回调
    fileTreeCallback?: (file: import("../layout/dock/Files").Files) => void // 焦点在文档树上时执行的回调
    editorCallback?: (protyle: IProtyle) => void     // 焦点在编辑器上时执行的回调
    dockCallback?: (element: HTMLElement) => void    // 焦点在 dock 上时执行的回调
}

interface IPluginData {
    displayName: string,
    name: string,
    js: string,
    css: string,
    i18n: IObject
}

interface IPluginDockTab {
    position: TPluginDockPosition,
    size: Config.IUILayoutDockPanelSize,
    icon: string,
    hotkey?: string,
    title: string,
    index?: number
    show?: boolean
}

interface IExportOptions {
    type: string,
    id: string,
}

interface IOpenFileOptions {
    app: import("../index").App,
    searchData?: Config.IUILayoutTabSearchConfig, // 搜索必填
    // card 和自定义页签 必填
    custom?: {
        title: string,
        icon: string,
        data?: any
        id: string,
        fn?: (options: {
            tab: import("../layout/Tab").Tab,
            data: any,
        }) => import("../layout/Model").Model,   // plugin 0.8.3 历史兼容
    }
    assetPath?: string, // asset 必填
    fileName?: string, // file 必填
    rootIcon?: string, // 文档图标
    id?: string,  // file 必填
    rootID?: string, // file 必填
    position?: string, // file 或者 asset，打开位置
    page?: number | string, // asset
    mode?: TEditorMode // file
    action?: TProtyleAction[]
    keepCursor?: boolean // file，是否跳转到新 tab 上
    zoomIn?: boolean // 是否缩放
    removeCurrentTab?: boolean // 在当前页签打开时需移除原有页签
    openNewTab?: boolean // 使用新页签打开
    afterOpen?: (model?: import("../layout/Model").Model) => void // 打开后回调
}

interface ILayoutOptions {
    direction?: Config.TUILayoutDirection;
    size?: string;
    resize?: Config.TUILayoutDirection;
    type?: Config.TUILayoutType;
    element?: HTMLElement;
}

interface ITab {
    icon?: string;
    docIcon?: string;
    title?: string;
    panel?: string;
    callback?: (tab: import("../layout/Tab").Tab) => void;
}

interface IWebSocketData {
    cmd?: string;
    callback?: string;
    data?: any;
    msg: string;
    code: number;
    sid?: string;
}

interface IGraphCommon {
    d3: {
        centerStrength: number
        collideRadius: number
        collideStrength: number
        lineOpacity: number
        linkDistance: number
        linkWidth: number
        nodeSize: number
        arrow: boolean
    };
    type: {
        blockquote: boolean
        code: boolean
        heading: boolean
        list: boolean
        listItem: boolean
        math: boolean
        paragraph: boolean
        super: boolean
        table: boolean
        tag: boolean
    };
}

interface IKeymapItem {
    default: string,
    custom: string
}

interface IFile {
    icon: string;
    name1: string;
    alias: string;
    memo: string;
    bookmark: string;
    path: string;
    name: string;
    hMtime: string;
    hCtime: string;
    hSize: string;
    dueFlashcardCount?: string;
    newFlashcardCount?: string;
    flashcardCount?: string;
    id: string;
    count: number;
    subFileCount: number;
}

interface IBlockTree {
    box: string,
    nodeType: string,
    hPath: string,
    subType: string,
    name: string,
    type: string,
    depth: number,
    url?: string,
    label?: string,
    id?: string,
    blocks?: IBlock[],
    count: number,
    children?: IBlockTree[]
}

interface IBlock {
    riffCard?: IRiffCard,
    depth?: number,
    box?: string;
    path?: string;
    hPath?: string;
    id?: string;
    rootID?: string;
    type?: string;
    content?: string;
    def?: IBlock;
    defID?: string
    defPath?: string
    refText?: string;
    name?: string;
    memo?: string;
    alias?: string;
    tag?: string;
    refs?: IBlock[];
    children?: IBlock[]
    length?: number
    ial: IObject
}

interface IRiffCard {
    due?: string;
    reps?: number; // 闪卡复习次数
}

interface IModels {
    editor: import("../editor").Editor [],
    graph: import("../layout/dock/Graph").Graph[],
    outline: import("../layout/dock/Outline").Outline[]
    backlink: import("../layout/dock/Backlink").Backlink[]
    inbox: import("../layout/dock/Inbox").Inbox[]
    files: import("../layout/dock/Files").Files[]
    bookmark: import("../layout/dock/Bookmark").Bookmark[]
    tag: import("../layout/dock/Tag").Tag[]
    asset: import("../asset").Asset[]
    search: import("../search").Search[]
    custom: import("../layout/dock/Custom").Custom[]
}

interface IMenu {
    checked?: boolean,
    iconClass?: string,
    label?: string,
    click?: (element: HTMLElement, event: MouseEvent) => boolean | void | Promise<boolean | void>
    type?: "separator" | "submenu" | "readonly" | "empty",
    accelerator?: string,
    action?: string,
    id?: string,
    submenu?: IMenu[]
    disabled?: boolean
    icon?: string
    iconHTML?: string
    current?: boolean
    bind?: (element: HTMLElement) => void
    index?: number
    element?: HTMLElement
    ignore?: boolean
    warning?: boolean
}

interface IBazaarItem {
    incompatible?: boolean;  // 仅 plugin
    enabled: boolean;
    preferredName: string;
    preferredDesc: string;
    preferredReadme: string;
    iconURL: string;
    stars: string;
    author: string;
    updated: string;
    downloads: string;
    current: false;
    installed: false;
    outdated: false;
    name: string;
    previewURL: string;
    previewURLThumb: string;
    repoHash: string;
    repoURL: string;
    url: string;
    openIssues: number;
    version: string;
    modes: string[];
    hSize: string;
    hInstallSize: string;
    hInstallDate: string;
    hUpdated: string;
    preferredFunding: string;
}

interface IAV {
    id: string;
    name: string;
    view: IAVTable | IAVGallery;
    viewID: string;
    viewType: TAVView;
    views: IAVView[];
}

interface IAVView {
    name: string;
    desc: string;
    id: string;
    type: TAVView;
    icon: string;
    hideAttrViewName: boolean;
    pageSize: number;
    showIcon: boolean;
    wrapField: boolean;
    filters: IAVFilter[],
    sorts: IAVSort[],
    groups: IAVView[]
    group: IAVGroup
}

interface IAVTable extends IAVView {
    columns: IAVColumn[],
    rows: IAVRow[],
    rowCount: number,
}

interface IAVGallery extends IAVView {
    coverFrom: number;    // 0：无，1：内容图，2：资源字段，3：内容块
    coverFromAssetKeyID?: string;
    cardSize: number;   // 0：小卡片，1：中卡片，2：大卡片
    cardAspectRatio: number;
    fitImage: boolean;
    cards: IAVGalleryItem[],
    desc: string
    fields: IAVColumn[]
    cardCount: number,
}

interface IAVFilter {
    column: string,
    operator: TAVFilterOperator,
    value: IAVCellValue,
    relativeDate?: relativeDate
    relativeDate2?: relativeDate
}

interface relativeDate {
    count: number;   // 数量
    unit: number;    // 单位：0: 天、1: 周、2: 月、3: 年
    direction: number;   // 方向：-1: 前、0: 现在、1: 后
}

interface IAVGroup {
    field: string,
    method?: number //  0: 按值分组、1: 按数字范围分组、2: 按相对日期分组、3: 按天日期分组、4: 按周日期分组、5: 按月日期分组、6: 按年日期分组
    range?: {
        numStart: number // 数字范围起始值
        numEnd: number   // 数字范围结束值
        numStep: number  // 数字范围步长
    }
    order?: number  // 升序: 0(默认), 降序: 1, 手动排序: 2
}

interface IAVSort {
    column: string,
    order: "ASC" | "DESC"
}

interface IAVColumn {
    width: string,
    icon: string,
    id: string,
    name: string,
    desc: string,
    wrap: boolean,
    pin: boolean,
    hidden: boolean,
    type: TAVCol,
    numberFormat: string,
    template: string,
    calc: IAVCalc,
    date?: {
        autoFillNow: boolean,
    }
    // 选项列表
    options?: {
        name: string,
        color: string,
        desc?: string,
    }[],
    relation?: IAVColumnRelation,
    rollup?: IAVCellRollupValue
}

interface IAVRow {
    id: string,
    cells: IAVCell[]
}

interface IAVGalleryItem {
    coverURL?: string;
    coverContent?: string;
    id: string;
    values: IAVCell[];
}

interface IAVCell {
    id: string,
    color: string,
    bgColor: string,
    value: IAVCellValue,
    valueType: TAVCol,
}

interface IAVCellValue {
    keyID?: string,
    id?: string,
    type: TAVCol,
    isDetached?: boolean,
    text?: {
        content: string
    },
    number?: {
        content?: number,
        isNotEmpty: boolean,
        format?: string,
        formattedContent?: string
    },
    mSelect?: IAVCellSelectValue[]
    mAsset?: IAVCellAssetValue[]
    block?: {
        content: string,
        id?: string,
        icon?: string
    }
    url?: {
        content: string
    }
    phone?: {
        content: string
    }
    email?: {
        content: string
    }
    template?: {
        content: string
    },
    checkbox?: {
        checked: boolean
    }
    relation?: IAVCellRelationValue
    rollup?: {
        contents?: IAVCellValue[]
    }
    date?: IAVCellDateValue
    created?: IAVCellDateValue
    updated?: IAVCellDateValue
}

interface IAVCellRelationValue {
    blockIDs: string[];
    contents?: IAVCellValue[];
}

interface IAVCellDateValue {
    content?: number,
    isNotEmpty?: boolean
    content2?: number,
    isNotEmpty2?: boolean
    hasEndDate?: boolean
    formattedContent?: string,
    isNotTime?: boolean // 默认 true
}

interface IAVCellSelectValue {
    content: string,
    color: string
}

interface IAVCellAssetValue {
    content: string,
    name: string,
    type: "file" | "image"
}

interface IAVColumnRelation {
    avID?: string;
    backKeyID?: string;
    isTwoWay?: boolean;
}

interface IAVCellRollupValue {
    relationKeyID?: string;  // 关联列 ID
    keyID?: string;
    calc?: IAVCalc;
}

interface IAVCalc {
    operator?: string,
    result?: IAVCellValue
}

import { EditorView } from "codemirror";
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";

import { asyncLoadExternalFile } from "./external_fs";

function do_support_directory_upload(): boolean {
    const inputElem = document.createElement("input");
    inputElem.type = "file";
    return "webkitdirectory" in inputElem;
}

function loadFileThroughDialog(
    accept_format: string,
    set_app_state: SetAppStateHook["set_app_state"],
    on_loaded?: (file: GeneralExternalFile) => void
) {
    asyncLoadExternalFile(accept_format)
    .then(({path: title, content, ref_content}) => {
        if (on_loaded !== undefined) {
            on_loaded({path: title, content: content, ref_content: ref_content});
            return;
        }
        set_app_state((S) => {
            const active_editor_key = S.ActiveEditor;
            const new_editors = S.C0Editors.map(
                (tab) => {
                    if (tab.key === active_editor_key) {
                        return {
                            title: title,
                            content: content ? content : "",
                            key: tab.key,
                            breakpoints: [],
                            ref_content: ref_content
                        };
                    } else {
                        return tab;
                    }
                }
            );
            return {C0Editors: new_editors};
        })
    })
}

// Reference: https://codemirror.net/examples/decoration/
class LoadDocumentWidget extends WidgetType {
    public set_app_state: SetAppStateHook["set_app_state"];
    public update_show  : (b: boolean) => void;
    public accept_format: string;
    public on_loaded?: (file: GeneralExternalFile) => void;
    public show_project_import: boolean;

    constructor(
        accept_format: string,
        set_app_state: SetAppStateHook["set_app_state"],
        update_show: (show: boolean) => void,
        on_loaded?: (file: GeneralExternalFile) => void,
        show_project_import: boolean = true
    ) {
        super();
        this.accept_format = accept_format;
        this.update_show   = update_show;
        this.set_app_state = set_app_state;
        this.on_loaded     = on_loaded;
        this.show_project_import = show_project_import;
    } 

    toDOM(view: EditorView): HTMLElement {
        const load_dom = document.createElement("i");
        load_dom.appendChild(document.createTextNode("Load a file by "));
        let tmp = document.createElement("a");
        tmp.className = "active-href";
        tmp.onclick = () => loadFileThroughDialog(this.accept_format, this.set_app_state, this.on_loaded);
        tmp.textContent = "Upload File"
        load_dom.appendChild(tmp);

        if (this.show_project_import && do_support_directory_upload()) {
            load_dom.appendChild(document.createElement("br"));
            load_dom.appendChild(document.createTextNode("Or "))
            let tmp2 = document.createElement("a");
            tmp2.className = "active-href";
            tmp2.textContent = "Import 15-122 Project"
            tmp2.onclick = () => this.update_show(true);
            load_dom.appendChild(tmp2);
        }

        load_dom.appendChild(document.createElement("br"));
        load_dom.appendChild(document.createTextNode("Or type anything in editor to remove this message."))

        load_dom.className = "editor-load-hint";
        return load_dom;
    }

    eq(widget: WidgetType): boolean {
        return true;    // All load document widget should be the same
    }

    ignoreEvent(event: Event): boolean {
        return false;
    }
}

function loadDOMWidgetInterface(
    view: EditorView,
    accept_format: string,
    set_app_state: SetAppStateHook["set_app_state"],
    update_show : (show: boolean) => void,
    on_loaded?: (file: GeneralExternalFile) => void,
    show_project_import: boolean = true,
) {
    if (view.state.doc.length !== 0) return Decoration.none;
    
    return Decoration.set([
        Decoration.widget({
            widget: new LoadDocumentWidget(
                accept_format,
                set_app_state,
                update_show,
                on_loaded,
                show_project_import
            ),
            side: 0,
        }).range(0)
    ]);
}

/**
 * Entry point of LoadDocumentPlugin
 * 
 * @param accepted_format File formats supported by this loader, seperated by comma
 * example: ".bc0,.c0" or ".bc0"
 * 
 * @param update_name React call back function to update some internal states in 
 * react component. When the file is loaded, this function will be called with 
 * argument (s: string) where s is the file name of loaded file. [Optional]
 * 
 * @returns ViewPlugin that can be installed on code mirror editor
 */
function LoadDocumentPlugin(
    accepted_format: string,
    {app_state, set_app_state}: AppStateProp & SetAppStateHook,
    update_show  : (show: boolean) => void,
    on_loaded?: (file: GeneralExternalFile) => void,
    show_project_import: boolean = true
) {
    return ViewPlugin.fromClass(class {
        public decorations   : DecorationSet;
        public app_state     : AppStateProp["app_state"];
        public set_app_state : SetAppStateHook["set_app_state"];
        public update_show   : (show: boolean) => void
        public accept_format : string;
        public on_loaded?: (file: GeneralExternalFile) => void;
        public show_project_import: boolean;
    
        constructor (view: EditorView) {
            this.app_state     = app_state;
            this.set_app_state = set_app_state;
            this.accept_format = accepted_format;
            this.update_show   = update_show;
            this.on_loaded     = on_loaded;
            this.show_project_import = show_project_import;
            this.decorations   = loadDOMWidgetInterface(
                view,
                this.accept_format,
                this.set_app_state,
                this.update_show,
                this.on_loaded,
                this.show_project_import
            );
        }

        update(update: ViewUpdate) {
            this.decorations = loadDOMWidgetInterface(
                update.view,
                this.accept_format,
                this.set_app_state,
                this.update_show,
                this.on_loaded,
                this.show_project_import
            );
            return;
        }
    }, {
        decorations: v => v.decorations
    });
}

export { LoadDocumentPlugin };

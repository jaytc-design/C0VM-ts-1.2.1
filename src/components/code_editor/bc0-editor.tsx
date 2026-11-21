import React from "react";
import ReactCodeMirror, { basicSetup } from "@uiw/react-codemirror";
import { language } from "@codemirror/language";

import breakpointGutter    from "./editor_extension/breakpoint_marker";
import execLineHighlighter from "./editor_extension/exec_position";
import { BC0Language }     from "./editor_extension/syntax/bc0";
import BC0LightTheme       from "./editor_extension/bc0editor_theme";
import { asyncLoadExternalTextFile } from "./editor_extension/external_fs";
import * as VM from "../../vm_core/vm_interface";


export default class BC0Editor extends React.Component<BC0EditorProps>
{
    shouldComponentUpdate(nextProps: Readonly<BC0EditorProps>, nextState: Readonly<{}>, nextContext: any): boolean {
        const execLineChanged = this.props.execLine !== nextProps.execLine;
        const valueChanged = this.props.editorValue !== nextProps.editorValue;
        return execLineChanged || valueChanged;
    }

    render() {
        const breakpoint_extension = breakpointGutter({
            currBps : Array.from(this.props.breakpointVal),
            setBps  : this.props.updateBrkPts
        });

        const loadBC0 = () => {
            asyncLoadExternalTextFile(".bc0")
                .then(async ({path, content}) => {
                    const bc0Content = content ?? "";
                    if (!path.toLowerCase().endsWith(".bc0") ||
                        !bc0Content.toUpperCase().startsWith("C0 C0 FF EE")) {
                        globalThis.MSG_EMITTER.warn(
                            "Invalid BC0 File",
                            "Please select a valid .bc0 bytecode file."
                        );
                        return;
                    }

                    const printUpdate = (text: string) => {
                        this.props.set_app_state((state) => ({
                            PrintoutValue: state.PrintoutValue + text,
                        }));
                    };
                    const clearPrintout = () => {
                        this.props.set_app_state({PrintoutValue: ""});
                    };

                    this.props.set_app_state({
                        BC0SourceCode: bc0Content,
                        C0Runtime: undefined,
                        BC0BreakPoints: new Set(),
                        contentChanged: false,
                    });

                    const runtime = await VM.initialize(
                        bc0Content,
                        clearPrintout,
                        this.props.app_state.C0Editors,
                        printUpdate,
                        globalThis.MEM_POOL_SIZE,
                    );
                    this.props.set_app_state({
                        BC0SourceCode: bc0Content,
                        C0Runtime: runtime,
                        BC0BreakPoints: new Set(),
                        contentChanged: false,
                    });
                })
                .catch((error) => {
                    if (globalThis.DEBUG) console.error(error);
                });
        };

        return  <div>
                    <button className="active-href" onClick={loadBC0}>
                        Load a .bc0 file
                    </button>
                    <ReactCodeMirror
                        theme={BC0LightTheme}
                        basicSetup={false}
                        value = {this.props.editorValue}
                        extensions={[
                            breakpoint_extension,
                            basicSetup(),
                            language.of(BC0Language),
                            execLineHighlighter(this.props.execLine, "light"),
                        ]}
                        editable={false}
                    />
                </div>
    }
}

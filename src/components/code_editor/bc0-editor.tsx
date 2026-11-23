import React from "react";
import ReactCodeMirror, { basicSetup } from "@uiw/react-codemirror";
import { language } from "@codemirror/language";

import breakpointGutter    from "./editor_extension/breakpoint_marker";
import execLineHighlighter from "./editor_extension/exec_position";
import { BC0Language }     from "./editor_extension/syntax/bc0";
import BC0LightTheme       from "./editor_extension/bc0editor_theme";
import { LoadDocumentPlugin } from "./editor_extension/blank_load";
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

        const loadBC0 = async ({path, content}: GeneralExternalFile) => {
            const bc0Content = typeof content === "string" ? content : "";
            if (!(path.toLowerCase().endsWith(".bc0") ||
                path.toLowerCase().endsWith(".bc1")) || 
                !bc0Content.toUpperCase().startsWith("C0 C0 FF EE")) {
                globalThis.MSG_EMITTER.warn(
                    "Invalid BC0, BC1 File",
                    "Please select a valid .bc0, .bc1 bytecode file."
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
        };

        return  <div>
                    <ReactCodeMirror
                        theme={BC0LightTheme}
                        basicSetup={false}
                        value = {this.props.editorValue}
                        onUpdate={(update) => {
                            if (update.docChanged) {
                                this.props.set_app_state({
                                    BC0SourceCode: update.state.doc.toString(),
                                    C0Runtime: undefined,
                                    BC0BreakPoints: new Set(),
                                    contentChanged: false,
                                });
                            }
                        }}
                        extensions={[
                            breakpoint_extension,
                            basicSetup(),
                            language.of(BC0Language),
                            execLineHighlighter(this.props.execLine, "light"),
                            LoadDocumentPlugin(
                                ".bc0, .bc1",
                                {app_state: this.props.app_state, set_app_state: this.props.set_app_state},
                                () => {},
                                loadBC0,
                                false
                            ),
                        ]}
                        editable={true}
                    />
                </div>
    }
}

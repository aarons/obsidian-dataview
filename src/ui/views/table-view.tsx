import { Literal } from "data-model/value";
import { executeTable } from "query/engine";
import { Query, TableQuery } from "query/query";
import { asyncTryOrPropogate } from "util/normalize";
import {
    DataviewContext,
    DataviewInit,
    ErrorMessage,
    ErrorPre,
    Lit,
    Markdown,
    ReactRenderer,
    useIndexBackedState,
} from "ui/markdown";
import { h, Fragment } from "preact";
import { useContext } from "preact/hooks";
import { MarkdownRenderChild } from "obsidian";

/** Simple table over headings and corresponding values. */
export function TableGrouping({
    headings,
    values,
    sourcePath,
}: {
    headings: string[];
    values: Literal[][];
    sourcePath: string;
}) {
    let settings = useContext(DataviewContext).settings;

    return (
        <Fragment>
            <table class="dataview table-view-table">
                <thead class="table-view-thead">
                    <tr class="table-view-tr-header">
                        {headings.map(heading => (
                            <th class="table-view-th">
                                <Markdown sourcePath={sourcePath} content={heading} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody class="table-view-tbody">
                    {values.map(row => (
                        <tr>
                            {row.map(element => (
                                <td>
                                    <Lit value={element} sourcePath={sourcePath} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {settings.warnOnEmptyResult && values.length == 0 && (
                <ErrorMessage message="Dataview: No results to show for table query." />
            )}
        </Fragment>
    );
}

export type TableViewState =
    | { state: "loading" }
    | { state: "error"; error: string }
    | { state: "ready"; headings: string[]; values: Literal[][] };

/** Pure view over list elements.  */
export function TableView({ query, sourcePath }: { query: Query; sourcePath: string }) {
    let context = useContext(DataviewContext);

    let items = useIndexBackedState<TableViewState>(
        context.container,
        context.app,
        context.settings,
        context.index,
        { state: "loading" },
        async () => {
            let result = await asyncTryOrPropogate(() =>
                executeTable(query, context.index, sourcePath, context.settings)
            );
            if (!result.successful) return { state: "error", error: result.error };

            let showId = (query.header as TableQuery).showId;
            if (showId) {
                let dataWithNames: Literal[][] = [];
                for (let entry of result.value.data) dataWithNames.push([entry.id].concat(entry.values));

                let name =
                    result.value.idMeaning.type === "group"
                        ? result.value.idMeaning.name
                        : context.settings.tableIdColumnName;

                return { state: "ready", headings: [name].concat(result.value.names), values: dataWithNames };
            }

            // Do not append the ID field by default.
            return { state: "ready", headings: result.value.names, values: result.value.data.map(v => v.values) };
        }
    );

    if (items.state == "loading")
        return (
            <Fragment>
                <ErrorPre>Loading...</ErrorPre>
            </Fragment>
        );
    else if (items.state == "error")
        return (
            <Fragment>
                {" "}
                <ErrorPre>Dataview: {items.error}</ErrorPre>{" "}
            </Fragment>
        );

    return <TableGrouping headings={items.headings} values={items.values} sourcePath={sourcePath} />;
}

export function createTableView(init: DataviewInit, query: Query, sourcePath: string): MarkdownRenderChild {
    return new ReactRenderer(init, <TableView query={query} sourcePath={sourcePath} />);
}

export function createFixedTableView(
    init: DataviewInit,
    headings: string[],
    values: Literal[][],
    sourcePath: string
): MarkdownRenderChild {
    return new ReactRenderer(init, <TableGrouping values={values} headings={headings} sourcePath={sourcePath} />);
}

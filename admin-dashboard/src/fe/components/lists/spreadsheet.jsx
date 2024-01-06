import { h } from 'preact';
import { createRef, PureComponent } from 'preact/compat';
import TinyProgress from '../controls/tiny-progress';
import DisplayError from '../utils/error';
import { connect } from '../../core/connection';
import './spreadsheet.less';

/**
 * Renders a spreadsheet. Supports using core data views for rows.
 *
 * # Props
 * - columnCount: number
 * - rowCount: number
 * - loadedRowCount: number - number of rows (from the top) that are loaded
 * - columnName: index => name
 * - initialColumnSize: index => number (pixels)
 * - cellView: (column) => Component
 * - onCellClick: (row, coll, data, event) => void
 * - rowData: index => any.
 *   If the result is an array, will load a core data view with [name, opts, params]; otherwise
 *   it will just be passed to the cells directly.
 */
export default class Spreadsheet extends PureComponent {
    state = {
        columnSizes: [],
    };

    render () {
        let scrollWidth = 0;
        const columnSizes = [];
        const cellViews = [];
        for (let i = 0; i < this.props.columnCount; i++) {
            const size = getColumnSize(this.props.initialColumnSize, this.state.columnSizes, i);
            columnSizes.push(size);
            scrollWidth += size;
            cellViews.push(this.props.cellView(i));
        }

        const rows = [];
        for (let i = 0; i < this.props.rowCount; i++) {
            const isLoaded = i < this.props.loadedRowCount;
            rows.push(
                <Row
                    key={i}
                    index={i}
                    data={this.props.rowData(i)}
                    columnCount={this.props.columnCount}
                    columnSizes={columnSizes}
                    isLoaded={isLoaded}
                    onCellClick={this.props.onCellClick}
                    cellViews={cellViews} />
            );
        }

        return (
            <div class="spreadsheet">
                <div class="spreadsheet-scroll-contents" style={{ width: scrollWidth }}>
                    <Header
                        columnCount={this.props.columnCount}
                        columnName={this.props.columnName}
                        initialColumnSize={this.props.initialColumnSize}
                        userColumnSizes={this.state.columnSizes}
                        onColumnSizesChange={columnSizes => this.setState({ columnSizes })} />
                    {rows}
                </div>
            </div>
        );
    }
}

function getColumnSize (initialSize, userSizes, i) {
    return userSizes[i] ? userSizes[i] : initialSize(i);
}

class Header extends PureComponent {
    onResize (index, size) {
        const sizes = this.props.userColumnSizes.slice();
        sizes[index] = size;
        this.props.onColumnSizesChange(sizes);
    }

    render () {
        const items = [];
        for (let i = 0; i < this.props.columnCount; i++) {
            const size = getColumnSize(this.props.initialColumnSize, this.props.userColumnSizes, i);
            const index = i;
            const column = <HeaderColumn
                name={this.props.columnName(i)}
                size={size}
                onResize={size => this.onResize(index, size)} />;
            items.push(column);
        }

        return (
            <div class="spreadsheet-row spreadsheet-header">
                {items}
                <div class="spreadsheet-fill-cell" />
            </div>
        );
    }
}

class HeaderColumn extends PureComponent {
    handle = createRef();

    startX = null;
    originalSize = null;
    onPointerDown = e => {
        e.preventDefault();
        this.startX = e.clientX;
        this.originalSize = this.props.size;
        this.handle.current.setPointerCapture(e.pointerId);
    };
    onPointerMove = e => {
        if (this.startX === null) return;
        e.preventDefault();
        const dx = e.clientX - this.startX;
        this.props.onResize(Math.max(40, this.originalSize + dx));
    };
    onPointerUp = e => {
        if (this.startX === null) return;
        e.preventDefault();
        this.startX = null;
        this.handle.current.releasePointerCapture(e.pointerId);
    };

    render ({ name, size }) {
        return (
            <div
                class="spreadsheet-cell spreadsheet-header-cell"
                style={{ width: size }}>
                <div class="cell-contents" title={name}>{name}</div>
                <div
                    class="cell-resizing-handle"
                    ref={this.handle}
                    onPointerDown={this.onPointerDown}
                    onPointerMove={this.onPointerMove}
                    onPointerUp={this.onPointerUp} />
            </div>
        );
    }
}

function Row (props) {
    if (props.isLoaded && Array.isArray(props.data)) return <CoreRow {...props} />;
    return <InnerRow {...props} />;
}

const CoreRow = connect(({ data }) => data)((data, _, error) => ({ data, error }))(props => {
    return <InnerRow
        {...props}
        isLoaded={props.isLoaded && props.data} />;
});

function InnerRow ({ isLoaded, columnCount, index, columnSizes, cellViews, onCellClick, data, error }) {
    if (error) {
        return (
            <div class="spreadsheet-row is-error">
                <DisplayError error={error} />
            </div>
        );
    }
    if (!isLoaded) {
        return (
            <div class="spreadsheet-row is-loading">
                <TinyProgress />
            </div>
        );
    }

    const cells = [];
    for (let i = 0; i < columnCount; i++) {
        cells.push(
            <RowCell
                key={i}
                row={index}
                column={i}
                data={data}
                size={columnSizes[i]}
                onClick={onCellClick}
                cellView={cellViews[i]} />
        );
    }

    return (
        <div class="spreadsheet-row">
            {cells}
            <div class="spreadsheet-fill-cell" />
        </div>
    );
}

class RowCell extends PureComponent {
    render ({ data, size, row, column, cellView: CellView, onClick }) {
        return (
            <div
                class="spreadsheet-cell"
                onClick={e => {
                    if (onClick) {
                        onClick(row, column, data, e);
                    }
                }}
                style={{ width: size }}>
                <div class="cell-contents">
                    <CellView
                        row={row}
                        column={column}
                        size={size}
                        data={data} />
                </div>
            </div>
        );
    }
}

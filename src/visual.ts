/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import * as d3 from 'd3';
import DataViewObjects = powerbi.DataViewObjects;

import { VisualSettings } from "./settings";

/*Row Item */
export interface Pipeline {
    Company: String;
    Phase: string;
    MoA: string;
    ProductName: string;
}

/*projects by group*/
export interface Pipelines {
    SalesForce: Pipeline[];
}

export function logExceptions(): MethodDecorator {
    return function (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>)
        : TypedPropertyDescriptor<any> {

        return {
            value: function () {
                try {
                    return descriptor.value.apply(this, arguments);
                } catch (e) {
                    // this.svg.append('text').text(e).style("stroke","black")
                    // .attr("dy", "1em");
                    throw e;
                }
            }
        };
    };
}

export function getCategoricalObjectValue<T>(objects: DataViewObjects, index: number, objectName: string, propertyName: string, defaultValue: T): T {
    if (objects) {
        let object = objects[objectName];
        if (object) {
            let property: T = <T>object[propertyName];
            if (property !== undefined) {
                return property;
            }
        }
    }
    return defaultValue;
}


export class Visual implements IVisual {
    private target: d3.Selection<HTMLElement, any, any, any>;
    private margin = { top: 50, right: 40, bottom: 50, left: 40 };
    private settings: VisualSettings;
    private host: IVisualHost;
    private events: IVisualEventService;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual Constructor', options);
        this.target = d3.select(options.element).append('div');
        this.host = options.host;
        this.events = options.host.eventService;
    }

    @logExceptions()
    public update(options: VisualUpdateOptions) {
        console.log('Visual Update ', options);
        this.events.renderingStarted(options);
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
        this.target.selectAll('*').remove();
        let _this = this;
        this.target.attr('class', 'pipeline-container');
        this.target.attr('style', 'height:' + (options.viewport.height) + 'px;width:' + (options.viewport.width) + 'px');
        let gHeight = options.viewport.height - this.margin.top - this.margin.bottom;
        let gWidth = options.viewport.width - this.margin.left - this.margin.right;

        let pipelineData = Visual.converter(options.dataViews[0], this.host);
        let phaseData = ['Phase I', 'Phase II', 'Phase III', 'Filed', 'Approved'];

        let moAData = pipelineData.map(d => d.MoA).filter((v, i, self) => self.indexOf(v) === i);
        let colors = ['#2ECC71', '#336EFF', '#641E16', '#FF5733', '#3498DB', '#4A235A', '#154360', '#0B5345', '#784212', '#424949',
            '#17202A', '#E74C3C', '#00ff00', '#0000ff', '#252D48'];
        let moAColorData = moAData.map((d, i) => {
            return {
                moA: d,
                color: colors[i]
            };
        });

        let mainContent = this.target.append('div')
            .attr('class', 'main-content');

        mainContent.append('div')
            .attr('class', 'header')
            .append('p').text(this.settings.pipeline.title);

        let pipelineWrap = mainContent.append('div')
            .attr('class', 'pipeline-wrap');

        let pipelineBar = pipelineWrap.append('div')
            .attr('class', 'pipeline-bar');

        let phases = pipelineBar.selectAll('.phase')
            .data(phaseData)
            .enter()
            .append('div')
            .attr('class', function (d, i) {
                return 'phase ' + d.toLowerCase().replace(/ /g, '-');
            });

        phases.append('p')
            .attr('class', 'phase-text')
            .text(function (d, i) {
                return d;
            });

        phases.append('div')
            .attr('class', 'phase-arrow');

        phases.append('div')
            .attr('class', 'phase-rope');

        phases.append('div')
            .attr('class', 'phase-rope-circle');

        let companiesWrap = pipelineWrap.append('div')
            .attr('class', 'companies-wrap');

        let phaseCompanies = companiesWrap.selectAll('.phase-companies')
            .data(phaseData)
            .enter()
            .append('div')
            .attr('class', function (d, i) {
                return 'phase-companies ' + d.toLowerCase().replace(/ /g, '-');
            });

        let companies = phaseCompanies.selectAll('.phase-companies')
            .data(function (pd) {
                return pipelineData.filter(d => d.Phase === pd);
            })
            .enter()
            .append('div')
            .attr('class', 'company');

        companies.append('p')
            .attr('class', 'company-name')
            .attr('style', function (d) {
                let [moAcolor] = moAColorData.filter(cd => cd.moA === d.MoA);
                return 'color:' + moAcolor.color + ';';
            })
            .text(function (d) {
                return d.Company ? d.Company.toString() : '';
            });

        companies.append('p')
            .attr('class', 'product-name')
            .attr('style', function (d) {
                let [moAcolor] = moAColorData.filter(cd => cd.moA === d.MoA);
                return 'color:' + moAcolor.color + ';';
            }).text(function (d) {
                return d.ProductName ? d.ProductName.toString() : '';
            });

        let legendWrap = pipelineWrap.append('div')
            .attr('class', 'legend-wrap');

        legendWrap.selectAll('.legend')
            .data(moAColorData)
            .enter()
            .append('div')
            .attr('class', 'legend')
            .append('p')
            .attr('style', function (d) {
                return 'color:' + d.color + ';';
            })
            .text(function (d) {
                return d.moA ? d.moA.toString() : '';
            });

        let legendWrapHeight = legendWrap.node().getBoundingClientRect().height;
        let calcHeight = 335 + legendWrapHeight;
        companiesWrap.attr('style', 'height:calc(100% - ' + calcHeight + 'px);');
        this.events.renderingFinished(options);
    }

    /* converter to table data */
    public static converter(dataView: DataView, host: IVisualHost): Pipeline[] {
        let resultData: Pipeline[] = [];
        let tableView = dataView.table;
        let _rows = tableView.rows;
        let _columns = tableView.columns;
        let _companyIndex = -1, _phaseIndex = -1, _moAIndex = -1, _productIndex;
        for (let ti = 0; ti < _columns.length; ti++) {
            if (_columns[ti].roles.hasOwnProperty("Company")) {
                _companyIndex = ti;
            } else if (_columns[ti].roles.hasOwnProperty("Phase")) {
                _phaseIndex = ti;
            } else if (_columns[ti].roles.hasOwnProperty("MoA")) {
                _moAIndex = ti;
            } else if (_columns[ti].roles.hasOwnProperty("ProductName")) {
                _productIndex = ti;
            }
        }
        for (let i = 0; i < _rows.length; i++) {
            let row = _rows[i];
            let dp = {
                Company: row[_companyIndex] ? row[_companyIndex].toString() : null,
                Phase: row[_phaseIndex] ? row[_phaseIndex].toString() : null,
                MoA: row[_moAIndex] ? row[_moAIndex].toString() : null,
                ProductName: row[_productIndex] ? row[_productIndex].toString() : null
            };
            resultData.push(dp);
        }
        return resultData;
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return VisualSettings.parse(dataView) as VisualSettings;
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}
# Clusterview Grafana Plugin

A dense view of data points focused on high performance computing.

![Screenshot](https://raw.githubusercontent.com/HewlettPackard/hpe-grafana-clusterview-panel/v1.x-docs/doc/img/dashboard.png)



## Expected Query Data Format
Data is expected in the long format with a value column and one or more columns describing the layout. Additional field(s) can be present to provide additional information for mouseover, in-block display, or URLs for clickable links.

A minimal example of query data:

|      location |value|
| ------------- |-----|
| x1000c0s0b0n0 | 20.1|
| x1000c1s2b1n0 | 21.2|
| x1001c0s7b0n0 | 20.7|
|...|


A more complex query might add fields for additional text displays or URLs, and/or split the location to multiple fields:

| name      |  row  | slot | index |value| extid  |
| -         | -     | -    | -     | -   | -      |
| node 11-0 | 1     | 1    | 0     | 20.1| bk39dj |
| node 12-0 | 1     | 2    | 0     | 21.2| sMfek3 |
| node 21-0 | 2     | 1    | 0     | 20.7| BL9bap |
| node 21-1 | 2     | 1    | 1     | 16.0| LQ0doV |
|...|



### Data Grouping
The display is organized into a hierarchy based on one or more fields. Each layer of the hierachy can be configured differently to result in more complex layouts.

![layout group screenshot](https://raw.githubusercontent.com/HewlettPackard/hpe-grafana-clusterview-panel/v1.x-docs/doc/img/layoutgroup.png)

#### Field
Defines which field contains the location data for this layer. This can be either the name of the Field or can be a zero-indexed integer. If left blank, this will be the final layout group in the hierarchy.

#### Regex Match
A regular expression to extract location data from a field. This should be a regex with a singular capture group that defines the values for this layer in the hierarchy. If a Field does not need to be divided into pieces this can be left blank and the entire value will be used.

For example, if the location field looks like `x1000c0s0b0n0` then the regex match fields might be written as:

1. `(x\d+)` - identifier: x1000
1. `x\d+(c\d)` - identifier: c0
1. `x\d+c\d(s\d)` - identifier: s0
1. `x\d+c\ds\d(b\d)` - identifier: b0
1. `x\d+c\ds\db\d(n\d)` - identifier: n0

#### Possible Values
A set of possible instances that can exist for this layer can be specified here. A null-value placeholder will be shown for any values listed that are not present in the query. This can create a consistent output when query data is missing. It is also used to specify an order to the values, which are otherwise displayed in the order of data in the query.

#### Draw border and Show Label
Show labels or (partial) borders around data. 

Note: The borders and labels display around all entities in a layer and not individual instances in the layer, so their application may not always be intuitive.

#### Layout
Each layer (group) of the hierarchy can be laid out in a different layout orientation. 
Multiple layers with different layouts can combine to result in a complex arrangement.
The layout types are:
 * Horizontal - Nodes display across the screen.
 * Vertical - Nodes display vertically.
 * Flow - Similar to horizontal, but will wrap to the next line.
 * Grid - Display with a fixed number of columns.

### Node

The node section describes details about displaying nodes.

![Node screenshot](https://raw.githubusercontent.com/HewlettPackard/hpe-grafana-clusterview-panel/v1.x-docs/doc/img/node.png)

#### Node URL

If Node URL is present, each node is made into a link to the given URL. Variables can be included in the URL as well `${FieldName}`.

#### Node Text

The text to display on mouseover, or if In-Node Display is selected, directly on the node. Variables can be included in the text.

#### Value Field

Use this to specify the value used to determine colors for the display. This can be an integer index for the Field or the Field name.

* `1`
* `value`

#### Hidden Nodes

In some cases there may be nodes you wish to set aside space for but do not wish to display as missing. This might be to match a physical layout where something isn't present or populated. The hidden nodes field allows this. It takes one or more arrays of regexes to match against the different values in each layer group.

For each match desired, an array should be provided. That array should have the same number of elements as there are layers in the hierarchy. Each element should be a regex (escaped with /) that matches data on that layer. An array of regexes can be provided if only one match is needed. If there are multiple, an array of arrays should be used.

Given a dashboard having a 3 layer group hierarchy with the first layer of a,b,c; the second layer of 1,2,3; and the third layer also 1,2,3; the following would be examples of hidden node values:
* `[ /a/, /1/, /2/]` - node a12 will be left blank.
* `[ [ /b/, /.*/, /.*/],  [ /c/, /1/, /.*/]]` - All of b* and anything starting with c1* will be left blank.

### Values/Colors

A configuration for the spectrum of colors to display. Colors will be interpolated based on the query value. Values outside the range of given thresholds will be clamped to the nearest endpoint.

#### Condtions

A set of logical conditions to determine what color to display nodes as.
Multiple different conditional formats are supported.

The simplest usage is a singular value, which is matched exactly to the field specified in value: 
* `1` - matches 1 in the value field.
* `'ok'` - matches 'ok' in the value field.

Single, double, or no quotes can all be used to specify values.

The next simplest way to combine a logical operator with a value. This will also match against
the field specified in value. The following logical comparisons are supported for numbers: `==, =, <, <=, >, >=, !=`.
* `>3` - matches value field greater than 3.
* `!=10` - matches all values not equal to 10.

Additionally, regex matches can be done with `MATCH` or `MATCHES` (case insensitive). 
This will match partial values unless ^ and $ are used:
* `MATCH '^(ok|OK)$'` - matches any value field that equals `ok` or `OK`
* `MATCHES ".*01$"` - matches any value field that ends with `01`

Other fields can also be used (using either `$VAR` or `${VAR}` syntax). These can also be combined with boolean operators to create more complex conditions:
* `$value == 0 AND $status MATCHES 'ok.*'`
* `$value<1 && ($subvalue <10 || $subvalue == 'missing')`

The supported boolean operations are: `and, &&, &, or, ||, |, ()`

Conditionals are executed from top to bottom. The first matching condition will determine the color. An empty conditional field will match all existing fields.

### Aggregate

In the case of timeseries data, do an aggregate to reduce each node down to a singular value. In most cases, modifying the query to only report the latest data for each node is a more desirable solution than using an aggregate (especially for performance of large dashboards).

#### Aggregate data
In the case of multiple duplicate entries, use this method to merge them together.
* None - Don't do any merging. If any duplicates exist, the most recent value from the query is used.
* Max - Maximum value of all duplicates.
* Min - Minimum value of all duplicates.
* Avg - The average of all duplicates.
* Last - The most recent value is used. This requires a Timestamp Field to be selected.

#### Timestamp Field
The field to use as a timestamp. Only required in the case of using `last` as an aggregate
#### Ignore Null Values

If set, null values will be filtered out of the dataset. 


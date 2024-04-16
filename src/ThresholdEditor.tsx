import React, { useCallback, useMemo } from 'react';
import { ColorPicker, IconButton, InlineField, InlineFieldRow, Input } from '@grafana/ui';
import { StandardEditorProps } from '@grafana/data';
import { Condition } from 'types';


/**
 * A custom editor panel for configuring logical expressions related to color output.
 * The configuration of multiple conditions was too complex for the built-in 
 * builder-provided tools.
 * @param param0 datastructure and onChange function
 * @returns subpanel for configuration conditions
 */
export const ConditionEditor = ({ value, onChange }: StandardEditorProps<Condition[]>) => {

    const groups = [];

    const conditions = useMemo(() => {
        if (value) {
            return value;
        }
        return [];
    }, [value]);
    
    /**
     * swap data with previous
     * @param i index to swap
     */
    const swap = function(i: number) {
        const x = [
            ...conditions,
        ];
        const tmp = x[i];
        x[i] = x[i-1];
        x[i-1] = tmp;
        onChange(x);
    }

    /**
     * remove entry and refresh
     * @param i index to remove
     */
    const remove = function(i: number) {
        const x = [
            ...conditions,
        ];
        x.splice(i, 1);
        onChange(x);
    }

    /**
     * rebuild with new color
     */
    const onChangeColor = useCallback(
        (color, index) => {
            const x = [
                ...conditions,
            ];
            if(!x[index]) {
                x.push({
                    color: color,
                    expression: "",
                });
            } else {
                x[index].color = color;
            }
            onChange(x);
        },[onChange, conditions]
    );

    /**
     * rebuild with new text
     */
    const onChangeText = useCallback(
        (field, index) => {
            const text = field.target.value;
            const x = [
                ...conditions,
            ];
            if(!x[index]) {
                x.push({
                    color: "gray",
                    expression: text,
                });
            } else {
                x[index].expression = text;
            }
            onChange(x);
        },[onChange, conditions]
    );

    // All conditions plus one empty one for adding
    for (let i = 0; i < conditions.length + 1; i++) {
        groups.push(
        <InlineFieldRow>
            <InlineField style={{alignItems:"center"}}>
                <ColorPicker 
                    key={`ce-colorpick${i}`}
                    color={conditions[i]?conditions[i].color:"gray"}
                    onChange={(color) => {onChangeColor(color, i)}}
                    enableNamedColors={true}/>
            </InlineField>
            <InlineField grow>
                <Input key={`ce-exprtext${i}`} type="text" 
                    value={conditions[i]?.expression} onChange={(v) => {onChangeText(v, i)}}
                    placeholder={!conditions[i]?"add condition...":""}/>
            </InlineField>
            <InlineField disabled={i===0 || !conditions[i]} style={{alignItems:"flex-end"}}>
                <IconButton key={`ce-upbtn${i}`} name="arrow-up" onClick={() => {swap(i)}} />
            </InlineField>
            <InlineField disabled={!conditions[i]} style={{alignItems:"flex-end"}}>
                <IconButton key={`ce-delbtn${i}`} name="trash-alt" variant="destructive"onClick={() => {remove(i)}}/>
            </InlineField>
        </InlineFieldRow>
    )}
    return <div>{groups}</div>
}


type LevelDisplayDirection = 'hz' | 'vt' | 'fl' | 'gr';
type Aggregate = 'none' | 'max' | 'min' | 'last';

export interface Condition {
  expression: string;
  color: string;
}

export interface ClusterviewOptions {
  level1border: boolean;
  level1label: boolean;
  fieldgrp1: string;
  matchgrp1: string;
  valuesgrp1: string;
  gridX1: number;
  level1direction: LevelDisplayDirection;
  level2border: boolean;
  level2label: boolean;
  fieldgrp2: string;
  matchgrp2: string;
  valuesgrp2: string;
  gridX2: number;
  level2direction: LevelDisplayDirection;
  level3border: boolean;
  level3label: boolean;
  fieldgrp3: string;
  matchgrp3: string;
  valuesgrp3: string;
  gridX3: number;
  level3direction: LevelDisplayDirection;
  level4border: boolean;
  level4label: boolean;
  fieldgrp4: string;
  matchgrp4: string;
  valuesgrp4: string;
  gridX4: number;
  level4direction: LevelDisplayDirection;
  level5border: boolean;
  level5label: boolean;
  fieldgrp5: string;
  matchgrp5: string;
  valuesgrp5: string;
  gridX5: number;
  level5direction: LevelDisplayDirection;
  level6border: boolean;
  level6label: boolean;
  fieldgrp6: string;
  matchgrp6: string;
  valuesgrp6: string;
  gridX6: number;
  level6direction: LevelDisplayDirection;
  level7border: boolean;
  level7label: boolean;
  fieldgrp7: string;
  matchgrp7: string;
  valuesgrp7: string;
  gridX7: number;
  level7direction: LevelDisplayDirection;
  level8border: boolean;
  level8label: boolean;
  fieldgrp8: string;
  matchgrp8: string;
  valuesgrp8: string;
  gridX8: number;
  level8direction: LevelDisplayDirection;

  conditions: Condition[];
  missingcolor: string;
  bordercolor: string;

  nodeURLNewWindow: boolean;
  nodeX: number;
  nodeY: number;
  nodeURL: string;
  nodetext: string;
  nodetextDisplayed: boolean;
  nodevalue: string;
  hiddennodes: string;

  timestampField: string;
  aggregate: Aggregate;
  ignoreNull: boolean;
}

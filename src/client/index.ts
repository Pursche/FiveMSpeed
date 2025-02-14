/// <reference types="@citizenfx/client" />

// Add source map support at the very top
import SourceMapSupport from 'fivem-source-map-support';
SourceMapSupport.inject({ subdir: '[local]' });

import './utils';
import './roadrage';
import './level';
import './score';
import './speed';

console.log('Client resources loaded');

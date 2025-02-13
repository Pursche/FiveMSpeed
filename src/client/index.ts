/// <reference types="@citizenfx/client" />

// Add source map support at the very top
import SourceMapSupport from 'fivem-source-map-support';
SourceMapSupport.inject({ subdir: '[local]' });

// Import all your client TypeScript files
import './utils';
import './roadrage';
import './level';
import './score';
import './speed';

// Any initialization code can go here
console.log('Client resources loaded');

import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from "@rollup/plugin-terser"
import dts from "rollup-plugin-dts"

import html from '@rollup/plugin-html'
import livereload from 'rollup-plugin-livereload'
import serve from 'rollup-plugin-serve'

const port = 10101 // visit http://localhost:10101

const isDev = process.env.NODE_ENV === 'development'
const platformName = process.env.PLATFORM
const dtsPackage = process.env.DTS_PACKAGE

const LeaferUI = 'LeaferUI'
const external = { '@leafer/core': LeaferUI,  '@leafer-ui/core': LeaferUI}

const inPath = 'src/in/packages'
const platformPath = 'src/ui/packages/platform'

const platform ={
    'core': [
        {
            path: 'src/leafer/packages/core',
            withMin: 'min',
            withFormat: ['cjs']
        }, 
        {
            path: 'src/ui/packages/core',
            withMin: 'min',
            withFormat: ['cjs'],
            external: { '@leafer/core': LeaferUI}
        }
    ],

    'web': {
        path: 'src/ui',
        withGlobal: LeaferUI,
        withMin: 'min',
        external,
        fullGlobal: true
    },
    'worker': {
        path:  platformPath + '/worker',
        withGlobal: LeaferUI,
        withMin: 'min',
        external,
        fullGlobal: true
    },
    'node': {
        path:  platformPath + '/node',
        withMin: 'min',
        withFormat: ['cjs'],
        external
    },
    'miniapp': {
        path:  platformPath + '/miniapp',
        withMin: 'min',
        external
    },

    'in': [
        {
            name: 'editor',
            path:  inPath + '/editor',
            withGlobal: 'LeaferIN.editor',
            withMin: 'min',
            external
        }
    ]
} 

const plugins = [ 
    nodeResolve({
        browser: true,
        preferBuiltins: false,
    }),
    typescript({ 
        tsconfig: './tsconfig.json' 
    }),
    commonjs()
]


let config


if(isDev) {

    config = {
        input: 'index.ts',
        output: {
            sourcemap: true,
            file: 'dist/bundle.js',
            format: 'esm'
        },
        watch: {  exclude: ['node_modules/**']  },
        plugins: [
            ...plugins,
             html({
                title: "LeaferJS",
                meta: [{charset: 'utf-8'}, {name: 'viewport', content: 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no'}]
            }),
            livereload(),
            serve({contentBase: ['dist/'],  port})
        ]
    }

} else if(dtsPackage) {

    config = {
        input: dtsPackage + '/src/index.ts',
        output: {
            file: dtsPackage + '/types/index.d.ts'
        },
        plugins: [ dts()  ]
    }

} else {

    config = []

    let p = platform[platformName]
    if(!(p instanceof Array)) p = [p]

    const list = []

    p.forEach(c =>{
        
        if(c.input && c.output) {

            list.push(c)

        } else {

            const input = c.input || c.path + '/src/index.ts'
            const fileBase = c.path + '/dist/' + (c.name || platformName)
            
            const global = c.withGlobal
            const min = c.withMin
            let external = c.external

            list.push({external, input, output: fileBase + '.esm.js'})
            if(c.withMin) list.push({ min, external, input, output: fileBase + '.esm.' + min + '.js'})

            if(c.withFormat) {
                c.withFormat.forEach(format =>{
                    const cjs = format === 'cjs'
                    list.push({external, input, output: fileBase + (cjs ? '.cjs' : '.' + format + '.js'), format})
                    if(c.withMin) list.push({ min, external, input, output: fileBase + (cjs ? '.' + min + '.cjs' :'.' + format + '.' + min + '.js'), format})
                })
            }
            
            if(global) {
                if(c.fullGlobal) external = null
                list.push({global, external, input, output: fileBase + '.js'})
                if(c.withMin) list.push({ global, min, external, input, output: fileBase + '.' + min + '.js'})
            }

        }
    })

    list.forEach(c => {
        const item = {
            external: c.external ? Object.keys(c.external) : null,
            input: c.input,
            plugins: [...plugins]
        }

        if(c.global) {

            item.output = {
                file: c.output,
                name: c.global,
                format: c.format || 'iife',
            }

            if(c.external) item.output.globals = c.external

        } else {

            item.output = {
                file: c.output,
                format: c.format || 'esm'
            }

        }

        if(c.min) item.plugins.push(terser({ format: { comments: false} }))

        config.push(item)

    })

}

export default config
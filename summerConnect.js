//@flow
/* 
 * The HOC for component using summer container 
 * REVISE	Thu Feb 28 19:18:55 CST 2019
 * 	Add delegate function.
 */
import React		from 'react'

import {SummerContext}		from './SummerProvider.js'
import {Factory}		from '../factory.js'

const log		= require('loglevel').getLogger('../summer/summerConnect.js')

export function summerConnect(
	mapSummerToProps	: (factory : Factory) => Object		= () => ({}),
	options?	: {
		withRef		: boolean,
	},
	delegates?		: 
		(factory : Factory) => Array<{delegate : Function, to : Function}>,
){
	//{{{
	const label		= 'summerConnect'
	if(options && options.withRef === true){
		/*
		 * handle connect with REF
		 */
		return function wrapWithConnect(
			WrappedComponent	: any,
		){
			class S extends React.Component<{},{}>{
				render(){
					return (
						<SummerContext.Consumer>
							{(factory : Factory) => {
								const props	= mapSummerToProps(factory)
								/* Must inject component factory */
								props.factoryComponent	= factory.getFactoryComponent()
								/* Must inject i18next factory */
								props.getI18next		= factory.getI18next
								/* Must inject event model factory */
								props.getEventModel		= factory.getEventModel
								return <WrappedComponent 
									{...this.props} 
									{...props} 
									/* $FlowFixMe */
									ref={this.props.forwardedRef}
								/>
							}}
						</SummerContext.Consumer>
					)
				}
			}
			//$FlowFixMe
			const ComponentSummered		= React.forwardRef((props, ref) => {
				return <S {...props} forwardedRef={ref} />;
			})
			ComponentSummered.displayName		= `Summer(${getDisplayName(WrappedComponent)})`
			return ComponentSummered
		}
	}else if(delegates){
		/*
		 * do delegate connect
		 */
		return function wrapWithConnect(
			WrappedComponent	: any,
		){
			class ComponentSummered extends React.Component<{},{}>{
				render(){
					return (
						<SummerContext.Consumer>
							{(factory : Factory) => {
								class Inner extends React.Component<{},{}>{
									ref		: any
									constructor(props){
										super(props)
										/*
										 * delegate fn s
										 */
										delegates && delegates(factory).forEach(delegate => {
											delegate.to((...args) => {
												delegate.delegate.apply(this.ref, args)
											})
										})
									}
									render(){
										return(
											<WrappedComponent
												ref={r => this.ref = r}
												{...this.props}
											/>
										)
									}
								}
								const props	= mapSummerToProps(factory)
								/* Must inject component factory */
								props.factoryComponent	= factory.getFactoryComponent()
								/* Must inject i18next factory */
								props.getI18next		= factory.getI18next
								/* Must inject event model factory */
								props.getEventModel		= factory.getEventModel
								return <Inner
									{...this.props}
									{...props}
								/>
							}}
						</SummerContext.Consumer>
					)
				}
			}
			ComponentSummered.displayName		= `Summer(${getDisplayName(WrappedComponent)})`
			return ComponentSummered
		}
	}else{
		/*
		 * A ordinary connect
		 */
		return function wrapWithConnect(
			WrappedComponent	: any,
		){
			class ComponentSummered extends React.Component<{},{}>{
				render(){
					return (
						<SummerContext.Consumer>
							{(factory : Factory) => {
								const props	= mapSummerToProps(factory)
								/* Must inject component factory */
								props.factoryComponent	= factory.getFactoryComponent()
								/* Must inject i18next factory */
								props.getI18next		= factory.getI18next.bind(factory)
								/* Must inject event model factory */
								props.getEventModel		= factory.getEventModel
								return <WrappedComponent 
									{...this.props} 
									{...props} 
								/>
							}}
						</SummerContext.Consumer>
					)
				}
			}
			ComponentSummered.displayName		= `Summer(${getDisplayName(WrappedComponent)})`
			return ComponentSummered
		}
	}
	//}}}
}

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

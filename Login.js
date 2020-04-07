//@flow
/* 
 * User login/register UI here, for code re-use, register and login use a single
 * component
 */
import React from "react";
import { connect } from 'react-redux'
import { compose } from 'redux'
import { message as messageBox } from 'antd'
import { Trans } from 'react-i18next'

import { UserModelLocal } from '../../model/UserModelLocal.js'
import { User } from '../../model/User.js'
import { ERROR } from '../../error.js'
import { utils } from '../../utils/Utils.js'
import { type I18nextType } from '../../i18next.js'
import { summerConnect } from '../../summer/summerConnect.js'
import { Controller } from '../Controller.js'
import { Factory } from '../../factory.js'
import { popupSystemError, notification } from '../utils.js'
import { Icons } from '../../factoryIcons.js'

const log = require('loglevel').getLogger('../../component/user/Login.js')


type Props = {
	//invoke when login/register finished
	onOK?: (user: User) => void,
	jump2Home: () => void,
	//register: when mount the component, the status is: user register UI
	statusFormInit: 'register' | 'login',
	//pass the code for password-free login
	userCode?: string,
	getI18next: () => I18nextType,

	userModelLocal: UserModelLocal,
}
export class Login extends React.Component<Props, {
	//state
	emailLogin: string,
	emailRegister: string,
	emailForgot: string,
	passwordLogin: string,
	passwordRegister: string,
	emailMessageLogin?: string,
	emailMessageRegister?: string,
	emailMessageForgot?: string,
	passwordMessageRegister?: string,
	passwordMessageLogin?: string,
	/* 
	 * pending means waiting the local login check, if ok, jump to /app
	 * if not, show login UI
	 */
	statusForm: 'register' | 'login' | 'pending',
	//this variable control the enable/disable of the submit button
	isSubmitting: boolean,
	//if true: show the forgot form
	isForgotPassword: boolean,
	isForgotEmailSent: boolean,
}>{
	static FORM = {
		register: 'register',
		login: 'login',
	}

	constructor(props: Props) {
		//{{{
		super(props);
		//check
		utils.isType(props.onOK, 'Function')
		utils.isType(props.jump2Home, 'Function')
		utils.isTypeEnum(props.statusFormInit, Login.FORM)
		utils.isType(props.getI18next, 'Function')
		utils.isType(props.userModelLocal, 'defined')
		//
		this.state = {
			emailLogin: '',
			passwordLogin: '',
			emailRegister: '',
			emailForgot: '',
			passwordRegister: '',
			statusForm: 'pending',//props.statusFormInit,
			isSubmitting: false,
			isForgotPassword: false,
			isForgotEmailSent: false,
		}
		//bind
		//$FlowFixMe
		this.handleEmailForgotChange = this.handleEmailForgotChange.bind(this)
		//$FlowFixMe
		this.handleEmailLoginChange = this.handleEmailLoginChange.bind(this)
		//$FlowFixMe
		this.handleEmailRegisterChange = this.handleEmailRegisterChange.bind(this)
		//$FlowFixMe
		this.handleForgotClick = this.handleForgotClick.bind(this)
		//$FlowFixMe
		this.handleForgotPasswordClick = this.handleForgotPasswordClick.bind(this)
		//$FlowFixMe
		this.handleKeyPressLogin = this.handleKeyPressLogin.bind(this)
		//$FlowFixMe
		this.handleKeyPressRegister = this.handleKeyPressRegister.bind(this)
		//$FlowFixMe
		this.handlePasswordLoginChange = this.handlePasswordLoginChange.bind(this)
		//$FlowFixMe
		this.handlePasswordRegisterChange = this.handlePasswordRegisterChange.bind(this)
		//$FlowFixMe
		this.handleSubmitLogin = this.handleSubmitLogin.bind(this)
		//$FlowFixMe
		this.handleSubmitRegister = this.handleSubmitRegister.bind(this)
		//$FlowFixMe
		this.loginLocal = this.loginLocal.bind(this)
		//$FlowFixMe
		this.loginWithUserCode = this.loginWithUserCode.bind(this)
		//$FlowFixMe
		this.toggle = this.toggle.bind(this)
		//$FlowFixMe
		this.toLogin = this.toLogin.bind(this)
		//}}}
	}
	/********************** properties ************/
	/********************** react method ***********/

	/* When mount, first, check the url query, if there is user code,
	 * then try to login with user code, if not, try to load local
	 * user data */
	componentDidMount() {
		//{{{
		const label = 'Login -> componentDidMount'
		log.debug('%s:', label)
		const { userCode } = this.props
		if (userCode) {
			log.debug('%s:there is user code, try to login with it', label)
			this.loginWithUserCode()
		} else {
			log.debug('%s:no user code, try to load locally ', label)
			this.loginLocal()
		}
		//}}}
	}

	/********************** component method *******/
	async loginLocal() {
		//{{{
		/* 
		 * Try to load user from local , if got it ,
		 * then jump to OK
		 */
		const label = 'Login -> loginLocal'
		log.debug('%s:', label)
		const { userModelLocal, onOK } = this.props
		let user
		try {
			user = await utils.a(/*istanbul ignore next*/() => utils.E(), userModelLocal.loginLocal())
			//local login success, go to onOK to jump out and continue
			onOK && onOK(user)
		} catch (e) {
			if (e.message === ERROR.USER_LOGIN_LOCAL_DENY) {
				log.debug('%s:login fail, switch to login UI', label)
				this.setState({
					statusForm: this.props.statusFormInit,
				})
			} else {
				log.debug('%s:I don\'t known what error it is, show system error', label)
				popupSystemError(e, /*istanbul ignore next*/(c) => this.props.getI18next().t(c))
			}
		}
		//}}}
	}

	async loginWithUserCode() {
		//{{{
		const label = 'Login -> loginWithUserCode'
		log.debug('%s:', label)
		const { userCode, userModelLocal, onOK } = this.props
		if (userCode) {
			try {
				const user = await utils.a(/*istanbul ignore next*/() => utils.E(), userModelLocal.loginWithUserCode(userCode))
				onOK && onOK(user)
			} catch (e) {
				/*
				 * login with userCode failed, should pop a message, and 
				 * jump to login form
				 */
				log.warn('%s:login with user code fail', label, e)
				notification(
					'error',
					'Login failed',
					'Something went wrong, maybe login code is expired, please login again.',
				)
				this.setState({
					statusForm: Login.FORM.login,
				})
			}
		} else {
			log.warn('%s:why user code is undefined', label)
			this.setState({
				statusForm: this.props.statusFormInit,
			})
		}
		//}}}
	}

	/*
	 * Switch between login/register
	 * REVISE Wed Mar  6 09:47:12 CST 2019
	 * 	Add parameter.
	 */
	toggle() {
		//{{{
		this.setState({
			isForgotPassword: false,
			isForgotEmailSent: false,
			statusForm: this.state.statusForm === 'register' ?
				'login'
				:
				'register',
		})
		//}}}
	}

	toLogin() {
		//{{{
		this.setState({
			isForgotPassword: false,
			isForgotEmailSent: false,
			statusForm: 'login',
		})
		//}}}
	}

	/*istanbul ignore next*/
	handleEmailLoginChange(e: any) {
		//{{{
		this.setState({
			emailLogin: e.target.value,
			emailMessageLogin: undefined,
		})
		//}}}
	}

	/* istanbul ignore next */
	handlePasswordLoginChange(e: any) {
		//{{{
		this.setState({
			passwordLogin: e.target.value,
			passwordMessageLogin: undefined,
		})
		//}}}
	}

	async handleSubmitLogin() {
		//{{{
		const label = 'Login -> handleSubmitLogin'
		const { emailLogin, passwordLogin } = this.state
		log.debug(label, 'email:', emailLogin, 'password:', passwordLogin)
		//first, disable the button
		this.setState({
			isSubmitting: true,
		})
		try {
			const user = await utils.a(/* istanbul ignore next*/() => utils.E(), this.props.userModelLocal.login(emailLogin, passwordLogin))
			this.props.onOK && this.props.onOK(user)
		} catch (e) {
			log.debug(label, 'Catch error:', e)
			if (ERROR.isErrorLoginEmail(e.message)) {
				const message = this.props.getI18next().t(e.message)
				this.setState({
					emailMessageLogin: message,
				})
			} else if (ERROR.isErrorLoginPassword(e.message)) {
				const message = this.props.getI18next().t(e.message)
				this.setState({
					passwordMessageLogin: message,
				})
			} else {
				log.error('%s:un-handled error', label, e)
				popupSystemError(e, /*istanbul ignore next*/(c) => this.props.getI18next().t(c))
			}
			//enable the button again
			this.setState({
				isSubmitting: false,
			})
		}
		//}}}
	}

	/*istanbul ignore next*/
	handleEmailRegisterChange(e: any) {
		//{{{
		this.setState({
			emailRegister: e.target.value,
			emailMessageRegister: undefined,
		})
		//}}}
	}

	/*istanbul ignore next*/
	handlePasswordRegisterChange(e: any) {
		//{{{
		this.setState({
			passwordRegister: e.target.value,
			passwordMessageRegister: undefined,
		})
		//}}}
	}

	async handleSubmitRegister() {
		//{{{
		const label = 'Register -> handleSubmit!'
		const { emailRegister, passwordRegister } = this.state
		const { userModelLocal, onOK } = this.props
		//first, disable the button
		this.setState({
			isSubmitting: true,
		})
		log.debug(label,
			'email:', emailRegister,
			'password:', passwordRegister)
		try {
			const user = await utils.a(/* istanbul ignore next*/() => utils.E(), userModelLocal.register(emailRegister, passwordRegister))
			onOK && onOK(user)
		} catch (e) {
			log.debug(label, 'Catch error:', e)
			if (ERROR.isErrorRegisterEmail(e.message)) {
				const message = this.props.getI18next().t(e.message)
				this.setState({
					emailMessageRegister: message,
				})
			} else if (ERROR.isErrorRegisterPassword(e.message)) {
				const message = this.props.getI18next().t(e.message)
				this.setState({
					passwordMessageRegister: message,
				})
			} else {
				log.error('%s:un-handled error', label, e)
				popupSystemError(e, /*istanbul ignore next*/(c) => this.props.getI18next().t(c))
			}
			//enable the button again
			this.setState({
				isSubmitting: false,
			})
		}
		//}}}
	}

	/*
	 * To handle user stroke key on the password input
	 */
	/*istanbul ignore next*/
	handleKeyPressRegister(e: SyntheticKeyboardEvent<*>) {
		//{{{
		const label = 'Login -> handleKeyPressRegister'
		log.debug('%s:with:%s', label, e.key)
		switch (e.key) {
			case 'Enter': {
				log.debug('%s:user stroke enter, submit', label)
				this.handleSubmitRegister()
			}
		}
		//}}}
	}

	/*
	 * To handle user stroke key on the login password input 
	 */
	/*istanbul ignore next*/
	handleKeyPressLogin(e: SyntheticKeyboardEvent<*>) {
		//{{{
		const label = 'Login -> handleKeyPressLogin'
		log.debug('%s:', label)
		switch (e.key) {
			case 'Enter': {
				log.debug('%s:user stroke enter, submit', label)
				this.handleSubmitLogin()
			}
		}
		//}}}
	}

	handleForgotClick() {
		//{{{
		const label = 'Login -> handleForgotClick'
		log.debug('%s:', label)
		this.setState({
			isForgotPassword: true,
		})
		//}}}
	}

	/*
	 * Click the send mail button
	 */
	async handleForgotPasswordClick() {
		//{{{
		const label = 'Login -> handleForgotPasswordClick'
		log.debug('%s:', label)
		const { userModelLocal } = this.props
		const { emailForgot } = this.state
		try {
			utils.isType(
				await utils.a(/*istanbul ignore next*/() => utils.E(), userModelLocal.passwordForgot(emailForgot)),
				true
			)
			//pass
			this.setState({
				isForgotEmailSent: true,
			})
		} catch (e) {
			/*istanbul ignore else: impossible*/
			if (e.message === ERROR.USER_PASSWORD_FORGOT_EMAIL_NOT_EXISTS) {
				log.debug('%s:email not exists', label)
				this.setState({
					emailMessageForgot: 'the email not existes',
				})
			} else {
				log.error('%s:un-handled error', label, e)
				popupSystemError(e, /*istanbul ignore next*/(c) => this.props.getI18next().t(c))
			}
		}
		//}}}
	}

	/*istanbul ignore next*/
	handleEmailForgotChange(e: SyntheticInputEvent<*>) {
		//{{{
		this.setState({
			emailForgot: e.target.value,
			emailMessageForgot: undefined,
		})
		//}}}
	}


	render() {
		//{{{
		const label = 'Login -> render'
		log.trace('%s:', label)
		const {
			statusForm,
			isSubmitting,
			isForgotPassword,
			isForgotEmailSent,
			emailForgot,
			emailMessageForgot,
		} = this.state
		if (statusForm === 'pending') {
			return <div
				style={{
					width: '100%',
					height: '100vh',
				}}
				className='dark-style pending'
			></div>
		}
		/*
		 * render forgot password form
		 */
		if (isForgotPassword) {
			return (
				<div className='dark-style' >
					<div className={`auth-page ${statusForm === 'login' ? 'sign-in' : 'sign-up'}`} >
						<div className='auth-head'>
							<div className='auth-head-back-home'>
								<div></div>
								<a href='https://www.midinote.me' >
									{this.props.getI18next().t('user.login.back')}
								</a>
							</div>
							<div className='auth-head-to-other to-sign-up'>
								<div className='no-before' >
									{statusForm === 'login' ?
										this.props.getI18next().t('user.login.register.desc')
										:
										this.props.getI18next().t('user.register.login.desc')

									}
								</div>
								<div
									className='no-before'
									onClick={this.toggle}
								>
									{statusForm === 'login' ?
										this.props.getI18next().t('user.login.register.submit')
										:
										this.props.getI18next().t('user.register.login.submit')

									}
								</div>
							</div>
						</div>

						<div className='auth-main'>
							<div className='auth-main-logo'>
								<Icons.Logo />
							</div>
							<div className='auth-main-content'>
								{!isForgotEmailSent &&
									<div
										style={{ display: 'block' }}
										className='auth-main-forgot-form'>
										<div className='auth-main-form-title'>
											<span>RESET</span> <span>YOUR</span> <span>PASSWORD</span>
										</div>
										<div className='auth-main-form-title-info'>
											Enter your email address and we will send you a link to reset your password.
											<a
												style={{
													textDecoration: 'underline',
													marginLeft: 20,
												}}
												onClick={this.toLogin}
											>
												&lt; go back
											</a>
										</div>

										<div className='auth-main-form-item'>
											<div className={`auth-main-form-item-label ${emailMessageForgot ? 'auth-form-item-value-error' : ''}`}>
												<div className='auth-main-form-label-value'>EMAIL</div>
												<div className='auth-main-form-value-info'>{emailMessageForgot}</div>
											</div>
											<div className='auth-main-form-item-input'>
												<input
													onChange={this.handleEmailForgotChange}
													value={emailForgot}
													placeholder='Your email address.'
													maxLength='50'
												/>
											</div>
										</div>
										<div className='auth-main-form-btn'>
											<div
												onClick={this.handleForgotPasswordClick}
												className='form-btn-reset-psw button-send'>
												Send Password Reset Email
											</div>
										</div>
									</div>
								}
								{isForgotEmailSent &&
									<div
										style={{ display: 'block' }}
										className='auth-main-forgot-form'>
										<div className='auth-main-form-title'>
											<span>RESET</span> <span>YOUR</span> <span>PASSWORD</span>
										</div>
										<div className='auth-main-form-title-info sent'>
											We have sent the password reset email to you, please check your email inbox.
											<a
												style={{
													textDecoration: 'underline',
													marginLeft: 20,
												}}
												onClick={this.toLogin}
											>
												&lt; go back
											</a>
										</div>
									</div>
								}
							</div>
						</div>
					</div>
				</div>
			)
		}

		return (//$FlowFixMe
			<React.Fragment>
				<div className='dark-style' >
					<div className={`auth-page ${statusForm === 'login' ? 'sign-in' : 'sign-up'}`} >
						<div className='auth-head'>
							<div className='auth-head-back-home'>
								<div>{/* TODO whether display the logo ? */}</div>
								<a href='https://www.midinote.me' >
									{this.props.getI18next().t('user.login.back')}
								</a>
							</div>
							<div className='auth-head-to-other to-sign-up'>
								<div className='no-before' >
									{statusForm === 'login' ?
										this.props.getI18next().t('user.login.register.desc')
										:
										this.props.getI18next().t('user.register.login.desc')

									}
								</div>
								<div
									className='no-before'
									onClick={this.toggle}
								>
									{statusForm === 'login' ?
										this.props.getI18next().t('user.login.register.submit')
										:
										this.props.getI18next().t('user.register.login.submit')

									}
								</div>
							</div>
						</div>

						<div className='auth-main'>
							<div className='auth-main-logo'>
								<Icons.Logo />
							</div>
							<div className='auth-main-content'>
								{/* Login form */}
								<form action='' >
									<div className='auth-main-form'>
										<div className='auth-main-form-title'><Trans i18nKey='user.login.title' /></div>
										<div className='auth-main-form-item'>
											<TitleMessageC
												title={this.props.getI18next().t('user.login.email.title')}
												message={this.state.emailMessageLogin}
											/>
											<div className='auth-main-form-item-input'>
												<input
													onChange={this.handleEmailLoginChange}
													value={this.state.emailLogin}
													placeholder={this.props.getI18next().t('user.login.email.placeholder')}
													autoComplete='on'
													name='username'
													maxLength='50'
												/>
											</div>
										</div>
										<div className='auth-main-form-item'>
											<div className={`auth-main-form-item-label ${this.state.passwordMessageLogin ? 'auth-form-item-value-error' : ''}`}>
												<div className='auth-main-form-label-value' >
													{this.props.getI18next().t('user.login.password.title')}
												</div>
												<div className='auth-main-form-value-info login-password-error' >
													{this.state.passwordMessageLogin}
												</div>
											</div>
											<div className='auth-main-form-item-input'>
												<input
													type='password'
													onKeyPress={isSubmitting ? undefined : this.handleKeyPressLogin}
													onChange={this.handlePasswordLoginChange}
													value={this.state.passwordLogin}
													placeholder={this.props.getI18next().t('user.login.password.placeholder')}
													autoComplete='on'
													name='password'
													maxLength='50'
												/>
											</div>
										</div>
										<div className='auth-main-form-forgot-psw'>
											<Trans
												parent='p'
												i18nKey='user.login.forgot'
												i18n={this.props.getI18next()}>
												Forgot your password ?
											<a
													style={{ textDecoration: 'underline' }}
													onClick={this.handleForgotClick}
												>
													Reset it
											</a>
											</Trans>
										</div>
										<div
											className='auth-main-form-btn' >
											<div
												onClick={isSubmitting ? undefined : this.handleSubmitLogin}
												className={`form-btn-sign-in no-before ${isSubmitting ? 'btn-is-working' : ''}`} >
												{this.props.getI18next().t('user.login.submit')}
												<div className='btn-is-working-block'>
													<div className="btn-is-working-circle"></div>
													<div className="btn-is-working-circle"></div>
													<div className="btn-is-working-circle"></div>
												</div>
											</div>
										</div>
									</div>
								</form>
								{/* Register form */}
								<form action='' >
									<div className='auth-main-register-form'>
										<div className='auth-main-form-title'>{this.props.getI18next().t('user.register.title')}</div>
										<div className='auth-main-form-item'>
											<div className={`auth-main-form-item-label ${this.state.emailMessageRegister ? 'auth-form-item-value-error' : ''}`}>
												<div className='auth-main-form-label-value' >
													{this.props.getI18next().t('user.register.email.title')}
												</div>
												<div className='auth-main-form-value-info register-email-error' >
													{this.state.emailMessageRegister}
												</div>
											</div>
											<div className='auth-main-form-item-input'>
												<input
													onChange={this.handleEmailRegisterChange}
													placeholder={this.props.getI18next().t('user.register.email.placeholder')}
													name='username'
													autoComplete='on'
													maxLength='50'
												/>
											</div>
										</div>
										<div className='auth-main-form-item'>
											<div className={`auth-main-form-item-label ${this.state.passwordMessageRegister ? 'auth-form-item-value-error' : ''}`}>
												<div className='auth-main-form-label-value' >
													{this.props.getI18next().t('user.register.password.title')}
												</div>
												<div className='auth-main-form-value-info register-password-error' >
													{this.state.passwordMessageRegister}
												</div>
											</div>
											<div className='auth-main-form-item-input'>
												<input
													onKeyPress={isSubmitting ? undefined : this.handleKeyPressRegister}
													autoComplete='off'
													name='password'
													type='password'
													onChange={this.handlePasswordRegisterChange}
													maxLength='50'
													placeholder={this.props.getI18next().t('user.register.password.placeholder')} />
											</div>
										</div>
										<div
											className={'auth-main-form-btn'} >
											{/* TODO static text */}
											<div
												onClick={isSubmitting ? undefined : this.handleSubmitRegister}
												className={`form-btn-sign-up no-before ${isSubmitting ? 'btn-is-working' : ''}`}>
												{this.props.getI18next().t('user.register.submit')}
												<div className='btn-is-working-block'>
													<div className="btn-is-working-circle"></div>
													<div className="btn-is-working-circle"></div>
													<div className="btn-is-working-circle"></div>
												</div>
											</div>
											<div className='form-btn-sign-up-info'>
												<Trans
													parent='p'
													i18nKey='user.register.term'
													i18n={this.props.getI18next()} >
													By create an !account, you are agreeing to our<a style={{ textDecoration: 'underline' }} href='https://www.midinote.me/en/service.shtml' target='_blank' >Terms of Service</a>
												</Trans>
											</div>
										</div>
									</div>
								</form>
								{/* ---- user register form end ----- */}
							</div>
						</div>
					</div>
				</div>
				<Controller />
			</React.Fragment>
		)
		//}}}
	}

}

export const LoginConnected = compose(
	connect(
	),
	summerConnect(
		(factory: Factory) => {
			return {
				userModelLocal: factory.getUserModelLocal(),
			}
		}
	),
)(Login)


/* The new version, using react 16 API */
export class TitleMessageC extends React.Component<{
	title: string,
	message?: string,
}, {
	message: string,
	messageText: string,
	messageVisible: boolean,
}>{
	//{{{
	constructor(props: any) {
		super(props)
		//check
		utils.isType(props.title, 'string')
		this.state = {
			message: '',
			messageText: '',
			messageVisible: false,
		}
	}

	static getDerivedStateFromProps(props: any, state: any) {
		//{{{
		const label = 'TitleMessageC -> getDerivedStateFromProps'
		log.debug('%s:', label)
		const { message } = state
		const { message: nextMessage } = props
		let result = { message: nextMessage }
		if (nextMessage) {
			if (message) {
				if (message === nextMessage) {
					log.debug('%s:message equal', label)
					result = null
				} else {
					log.debug('%s:message changed', label)
					result = {
						...result,
						messageText: nextMessage,
					}
				}
			} else {
				log.debug('%s:set message', label)
				result = {
					...result,
					messageText: nextMessage,
					messageVisible: true,
				}
			}
		} else {
			if (message) {
				log.debug('%s:message none', label)
				result = {
					...result,
					messageVisible: false,
				}
			} else {
				log.debug('%s:message remove', label)
				result = {
					...result,
					messageVisible: false,
				}
			}
		}
		log.trace('%s:result state:', label, result)
		return result
		//}}}
	}

	shouldComponentUpdate(nextProps: any, nextState: any) {
		//{{{
		const label = 'TitleMessage -> shouldComponentUpdate'
		log.debug('%s:', label)
		let result = true
		if (nextState.message === this.state.message) {
			log.debug('%s:the state.message is the same,false', label)
			result = false
		}
		return result
		//}}}
	}

	render() {
		const label = 'TitleMessage -> render'
		log.trace('%s:', label)
		return (
			<div className={`auth-main-form-item-label ${this.state.messageVisible ? 'auth-form-item-value-error' : ''}`}>
				<div className='auth-main-form-label-value' >
					{this.props.title}
				</div>
				<div className='auth-main-form-value-info' >
					{this.state.messageText}
				</div>
			</div>
		)
	}
	//}}}
}

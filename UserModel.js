//@flow
/* 
 * The model for user : account, register, login, reset password and so on 
 * Note, this model will be executed at server
 */
import moment from 'moment'
import { User } from './User.js'
import { CONFIG } from '../config.js'
import { utils } from '../utils/Utils.js'
import { ERROR } from '../error.js'
import { DBNote } from './DBNote.js'
import { UserCode } from './UserCode.js'
import { EmailModel } from './EmailModel.js'
import { DBAccount } from './DBAccount.js'

const log = require('loglevel').getLogger('../model/UserModel.js')

export class UserModel {
	_getDBAccount: () => DBAccount
	/* The user code expire interval, used to check user login by code */
	_login_user_code_expire_time: number
	//The expire time for user reset password
	_expire_time_password_reset: number
	//the url to request the user api, this is used by email, to compose the 
	//url for user password reset: http://192.168.31.180:3002/api/user/...
	_userApiUrl: string

	/*
	 * The model injection
	 */
	_getEmailModel: () => EmailModel

	constructor(
		options: {
			_expire_time_password_reset: number,
			_userApiUrl: string,

			_getEmailModel: () => EmailModel,
			_getDBAccount: () => DBAccount,
		}
	) {
		//{{{
		//check
		utils.isType(options._expire_time_password_reset, 'number')
		utils.isType(options._userApiUrl, 'string')
		utils.isType(options._getEmailModel, 'Function')
		utils.isType(options._getDBAccount, 'Function')
		Object.assign(this, options)
		this._login_user_code_expire_time = 1000 * 60		//1 minute
		//}}}
	}

	setLoginUserCodeExpireTime(time: number) {
		this._login_user_code_expire_time = time
	}

	/* 
	 * to register a new account of Midinote
	 */
	async register(
		email: string,
		password: string
	):
		Promise<{
			user: User,
			userCode: UserCode,
		}> {
		//{{{
		const label = 'UserModel -> register'
		log.debug('%s:', label)
		const user = new User()
		user.email = email
		user.password = password
		/* 
		 * The user ID must be set 
		 */
		if (!user._id) {
			log.log(label, 'miss user.id')
			throw utils.E(ERROR.USER_REGISTER_USER_REQUIRED)
		}
		/* Check the email */
		if (!user.email) {
			log.log(label, 'miss user email')
			throw utils.E(ERROR.USER_REGISTER_EMAIL_REQUIRED)
		}
		/* Check the email format */
		if (!utils.checkEmail(user.email.toLowerCase())) {
			log.log(label, 'user email format is bad')
			throw utils.E(ERROR.USER_REGISTER_EMAIL_FORMAT)
		}

		if (!user.password) {
			log.log(label, 'miss user password')
			throw utils.E(ERROR.USER_REGISTER_PASSWORD_REQUIRED)
		}

		/* Check the password format */
		log.log(label, 'To checkt the password:', user.password)
		if (!utils.checkPassword(user.password)) {
			log.log(label, 'user password format wrong')
			throw utils.E(ERROR.USER_REGISTER_PASSWORD_FORMAT)
		}

		/* Check the is the email duplicated */
		const userWithTheSameEmail = await this._getDBAccount().getByEmail(user.email)
		if (userWithTheSameEmail) {
			throw utils.E(ERROR.USER_REGISTER_EMAIL_EXISTS)
		}

		/* Check OK, now , add the new user to DB */
		const r = await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().put(user))

		/* After register, to Create the user DB */
		utils.isType(
			await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().createDBServer(user._id)),
			true
		)
		/* To generate the user code for login */
		const userCode = new UserCode(user._id)
		utils.isType(
			await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().putUserCode(userCode)),
			true
		)
		/*
		 * After all, send email, NOTE, this is a async call, so, it means: I
		 * do not wait it return
		 */
		this._getEmailModel().sendEmail(
			EmailModel.EMAILS.WELCOME,
			{
				//TODO, maybe use this email account as user name is not a
				//good idea
				username: email.replace(/@.*$/, ''),
				appName: 'Midinote',
				createdTime: moment(Date.now()).format('MMM DD, YYYY')
			},
			email
		)
		return {
			user,
			userCode,
		}
		//}}}
	}

	/*
	 * Get user by id, if not found, throw not found error
	 */
	async get(id: string): Promise<User> {
		//{{{
		const label = 'UserModel -> get:'
		log.debug(label)
		User.checkId(id)
		return await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().get(id))
		//}}}
	}

	/*
	 * Login with email/password
	 */
	async login(
		email: string,
		password: string,
	): Promise<User> {
		//{{{
		//check
		utils.isType(email, 'string')
		utils.isType(password, 'string')
		const user = await this._getDBAccount().getByEmail(email)
		log.debug(
			'load user:',
			user && user._id,
			'by email:',
			email
		)
		if (user) {
			if (user.password === password) {
				//login successful!
				log.debug('Login successful!')
				return user
			} else {
				log.debug('Password wrong!')
				//password error
				throw utils.E(ERROR.USER_LOGIN_PASSWORD_WRONG)
			}
		} else {
			throw utils.E(ERROR.USER_LOGIN_USER_NOT_FOUND)
		}
		//}}}
	}

	/* Login by userCode, by now , this code is gen when user register, 
	 * then user can login by this code, the code has a short expire time
	 * */
	async loginWithUserCode(userCodeId: string): Promise<User> {
		//{{{
		const label = 'UserModel -> loginWithUserCode'
		log.debug('%s:', label)
		let userCode
		try {
			//get userCode from db
			userCode = await utils.a(() => utils.E(), this._getDBAccount().getUserCode(userCodeId))
			//check expire
			log.trace('%s:user code found, check the expire', label)
			if (Date.now() - userCode.createdTime > this._login_user_code_expire_time) {
				log.trace('%s:The code is expired:%d,now:%d,expire:%d',
					label,
					userCode.createdTime,
					Date.now(),
					this._login_user_code_expire_time,
				)
				throw utils.E(ERROR.USER_LOGIN_USER_CODE_EXPIRE)
			}
			log.trace('%s:Check code PASS!', label)
		} catch (e) {
			if (e.message === ERROR.GENERAL_NOT_FOUND) {
				throw utils.E(ERROR.USER_PASSWORD_FORGOT_CODE_INVALID)
			} else {
				//unknown
				throw e
			}
		}

		//load user
		const userId = userCode.value
		log.trace('%s:try to load user:%s', label, userId)
		const user: User = await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().get(userId))
		/*istanbul ignore next: impossible*/
		if (user) {
			log.trace('%s:found user', label)
			return user
		} else {
			log.trace('%s:user not found', label)
			throw utils.E(ERROR.GENERAL_NOT_FOUND)
		}
		//}}}
	}

	/* Forgot password, return a code to reset password */
	async passwordForgot(
		email: string
	): Promise<string> {
		//{{{
		const label = 'UserModel -> passwordForgot'
		log.debug('%s:', label)
		//check
		utils.isType(email, 'string')
		//Check the email
		const user = await this._getDBAccount().getByEmail(email)
		if (!user) {
			log.log('can not found user by email', email)
			utils.errorThrow(ERROR.USER_PASSWORD_FORGOT_EMAIL_NOT_EXISTS)
		}
		const code = new UserCode(email)
		utils.isType(
			await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().putUserCode(code)),
			true
		)
		log.log('generator a code for reset password:', code)
		/*
		 * To send the email to user
		 * NOTE, this is async call
		 */
		this._getEmailModel().sendEmail(
			EmailModel.EMAILS.RESET,
			{
				url: `${this._userApiUrl}/reset_password/${code._id}`
			},
			email
		)
		return code._id
		//}}}
	}

	async passwordReset(
		code: string,
		newPassword: string,
	): Promise<boolean> {
		//{{{
		const label = 'UserModel -> passwordReset:'
		log.debug(label, 'code:', code)
		//check
		utils.isType(code, 'string')
		utils.isType(newPassword, 'string')
		//Check the code is valid
		let codeInDB
		try {
			codeInDB = await this._getDBAccount().getUserCode(code)
			//To check the expire
			if (Date.now() - codeInDB.createdTime > this._expire_time_password_reset) {
				log.log(
					'The code is expired:',
					codeInDB.createdTime,
					'now:',
					Date.now()
				)
				utils.errorThrow(ERROR.USER_PASSWORD_FORGOT_CODE_EXPIRED)
			}
			log.log('Check code PASS!')
		} catch (e) {
			if (e.message === ERROR.GENERAL_NOT_FOUND) {
				throw utils.E(ERROR.USER_PASSWORD_FORGOT_CODE_INVALID)
			} else {
				//unknown
				throw e
			}
		}
		if (!utils.checkPassword(newPassword)) {
			throw new Error(ERROR.USER_REGISTER_PASSWORD_FORMAT)
		}
		//Reset the password
		const user = await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().getByEmail(codeInDB.value))
		if (!user) {
			throw utils.E(ERROR.GENERAL_NOT_FOUND)
		}
		user.password = newPassword
		log.log('To update user:', user._id)
		utils.isType(
			await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().put(user)),
			true
		)
		log.log('Reset password OK')
		//Delete the code
		utils.isType(
			await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().deleteUserCode(codeInDB)),
			true
		)
		return true
		//}}}
	}

	/*
	 * This invoke happens when user click the link in email, to open the reset
	 * webpage, if the code is expired, throw exception
	 */
	async passwordResetRequest(
		code: string,
	): Promise<boolean> {
		//{{{
		const label = 'UserModel -> passwordResetRequest:'
		//Check the code is valid
		log.debug(label, 'code:', code)
		let codeInDB
		try {
			codeInDB = await this._getDBAccount().getUserCode(code)
			//To check the expire
			if (Date.now() - codeInDB.createdTime > this._expire_time_password_reset) {
				log.log(
					'The code is expired:',
					codeInDB.createdTime,
					'now:',
					Date.now()
				)
				utils.errorThrow(ERROR.USER_PASSWORD_FORGOT_CODE_EXPIRED)
			}
			log.log('Check code PASS!')
		} catch (e) {
			if (e.message === ERROR.GENERAL_NOT_FOUND) {
				throw utils.E(ERROR.USER_PASSWORD_FORGOT_CODE_INVALID)
			} else {
				//unknown
				throw e
			}
		}
		return true
		//}}}
	}

	/* User change password manually */
	async passwordChange(
		userId: string,
		oldPassword: string,
		newPassword: string
	): Promise<boolean> {
		//{{{
		//check
		User.checkId(userId)
		utils.isType(oldPassword, 'string')
		utils.isType(newPassword, 'string')
		const user = await this._getDBAccount().get(userId)
		if (!user) {
			log.warn('Can not load user:', userId)
			utils.errorThrow(ERROR.USER_NOT_FOUND)
		}
		if (user.password !== oldPassword) {
			utils.errorThrow(ERROR.USER_PASSWORD_CHANGE_DENY)
		}
		if (!utils.checkPassword(newPassword)) {
			utils.errorThrow(ERROR.USER_REGISTER_PASSWORD_FORMAT)
		}

		user.password = newPassword
		utils.isType(
			await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().put(user)),
			true
		)
		return true
		//}}}
	}

	/* To request a email change , return a code to user */
	async emailChangeRequest(
		userId: string,
		password: string,
		newEmail: string
	): Promise<string> {
		///{{{
		//Check user
		const user = await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().get(userId))
		if (!user) {
			log.warn('Can not load user:', userId)
			utils.errorThrow(ERROR.USER_NOT_FOUND)
		}
		if (user.password !== password) {
			utils.errorThrow(ERROR.USER_LOGIN_PASSWORD_WRONG)
		}
		if (!utils.checkEmail(newEmail)) {
			utils.errorThrow(ERROR.USER_REGISTER_EMAIL_FORMAT)
		}

		const userCode = new UserCode({ userId, newEmail })
		utils.isType(
			await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().putUserCode(userCode)),
			true
		)
		log.log('generator a code for reset email:', userCode)
		return userCode._id
		//}}}
	}

	/*
	 * User click the link from new email inbox, to confirm the change 
	 * of email
	 */
	async emailChangeConfirm(code: string): Promise<boolean> {
		//{{{
		let codeInDB
		try {
			codeInDB = await this._getDBAccount().getUserCode(code)
		} catch (e) {
			if (e.message === ERROR.GENERAL_NOT_FOUND) {
				throw new Error(ERROR.USER_EMAIL_CHANGE_CODE_INVALID)
			} else {
				throw e
			}
		}
		const user = await this._getDBAccount().get(codeInDB.value.userId)
		if (!user) {
			utils.errorThrow(ERROR.USER_NOT_FOUND)
		}
		//Expire
		if (Date.now() - codeInDB.createdTime > CONFIG.EMAIL_RESET_EXPIRE) {
			log.log('The code is expired:',
				codeInDB.createdTime,
				'now:',
				Date.now())
			utils.errorThrow(ERROR.USER_EMAIL_CHANGE_CODE_EXPIRED)
		}
		const { newEmail } = codeInDB.value
		log.log(
			'Try to change user:%s email to :%s',
			user._id,
			newEmail,
		)
		user.email = newEmail
		utils.isType(
			await utils.a(/* istanbul ignore next */() => utils.E(), this._getDBAccount().put(user)),
			true
		)
		return true
		//}}}
	}

}


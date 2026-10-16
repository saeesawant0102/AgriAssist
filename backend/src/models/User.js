/**
 * User abstract base class
 * Attributes and operations mapped from Class Diagram and Section 8.
 */
export class User {
  #firebase_uid;

  constructor({
    user_id = null,
    firebase_uid,
    name,
    email,
    phone = null,
    address = null,
    status = 'active',
    user_type,
    created_at = null,
    updated_at = null,
  }) {
    if (new.target === User) {
      throw new Error('Cannot instantiate abstract class User directly');
    }

    this.user_id = user_id ? Number(user_id) : null;
    this.#firebase_uid = firebase_uid;
    this.name = name;
    this.email = email ? email.toLowerCase() : email;
    this.phone = phone;
    this.address = address;
    this.status = status;
    this.user_type = user_type;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  get firebase_uid() {
    return this.#firebase_uid;
  }

  // Requirement: Auth.Login
  login() {
    if (this.status === 'disabled') {
      throw new Error('Account is disabled');
    }
    return true;
  }

  // Requirement: Auth.Logout
  logout() {
    return true;
  }

  // Requirement: Auth.Profile.Update
  updateProfile({ name, phone, address }) {
    if (name !== undefined) this.name = name;
    if (phone !== undefined) this.phone = phone;
    if (address !== undefined) this.address = address;
    this.updated_at = new Date().toISOString();
  }

  toJSON() {
    return {
      user_id: this.user_id,
      user_type: this.user_type,
      name: this.name,
      email: this.email,
      phone: this.phone,
      address: this.address,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

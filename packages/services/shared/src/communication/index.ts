/**
 * Switchboard Communication Module
 *
 * Exports all communication-related functionality
 */

export { MessageBus, Message, MessageHandler, MessageBusConfig } from './message-bus';
export { ServiceRegistry, ServiceRegistration, ServiceQuery } from './service-registry';
export { HttpClient, HttpClientConfig, RequestOptions, HttpResponse } from './http-client';
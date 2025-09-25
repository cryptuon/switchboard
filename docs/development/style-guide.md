# ChainSync Style Guide

This document outlines the coding standards and conventions for the ChainSync project.

## General Principles

1. **Clarity over cleverness** - Code should be easily understood by others
2. **Consistency** - Follow established patterns in the codebase
3. **Explicit over implicit** - Make intentions clear through code and comments
4. **Security-first** - Consider security implications in all code changes

## Language-Specific Guidelines

### Rust (Solana Programs)

1. **Naming Conventions**
   - Use `snake_case` for variables, functions, and modules
   - Use `PascalCase` for types and traits
   - Use `SCREAMING_SNAKE_CASE` for constants

2. **Error Handling**
   - Use Rust's `Result` type for functions that can fail
   - Create custom error types for program-specific errors
   - Use descriptive error messages

3. **Documentation**
   - All public functions should have doc comments
   - Use examples in documentation when helpful
   - Keep documentation up to date with code changes

4. **Testing**
   - Write unit tests for all public functions
   - Use integration tests for complex workflows
   - Test both success and failure cases

### TypeScript (SDK and Services)

1. **Naming Conventions**
   - Use `camelCase` for variables and functions
   - Use `PascalCase` for classes and types
   - Use `SCREAMING_SNAKE_CASE` for constants

2. **Type Safety**
   - Use TypeScript's type system fully
   - Avoid `any` type when possible
   - Use strict mode in TypeScript configuration

3. **Error Handling**
   - Use try/catch blocks for asynchronous operations
   - Create custom error classes for specific error types
   - Handle errors close to where they occur

4. **Documentation**
   - Use JSDoc comments for all public APIs
   - Document complex logic with inline comments
   - Keep README files up to date

### Anchor (Solana Framework)

1. **Account Structs**
   - Use descriptive names for account structs
   - Group related accounts logically
   - Use proper constraints and validation

2. **Instruction Handlers**
   - Keep instruction handlers focused on single responsibilities
   - Use helper functions for complex logic
   - Validate all inputs at the beginning of handlers

## Code Organization

### File Structure
- Keep files focused on single responsibilities
- Use meaningful file names that describe their contents
- Group related functionality in the same directories

### Imports
- Group imports logically (external, internal, local)
- Use absolute imports when possible
- Keep import lists clean and organized

## Testing Standards

1. **Test Organization**
   - Place tests close to the code they test
   - Use descriptive test names that explain the expected behavior
   - Group related tests in test suites

2. **Test Coverage**
   - Aim for high test coverage but prioritize critical paths
   - Test edge cases and error conditions
   - Use property-based testing when appropriate

3. **Test Data**
   - Use realistic test data when possible
   - Create helper functions for common test setup
   - Clean up test data after tests run

## Documentation Standards

1. **README Files**
   - Every package should have a README explaining its purpose
   - Include setup instructions and usage examples
   - Document any configuration options

2. **API Documentation**
   - Document all public APIs with clear descriptions
   - Include examples for complex APIs
   - Keep documentation synchronized with code changes

3. **Architecture Documentation**
   - Document major architectural decisions
   - Explain the reasoning behind technical choices
   - Keep architecture diagrams up to date

## Git Workflow

1. **Commits**
   - Write clear, concise commit messages
   - Make small, focused commits
   - Reference issues in commit messages when relevant

2. **Branches**
   - Use descriptive branch names
   - Keep branches up to date with main branch
   - Delete branches after merging

3. **Pull Requests**
   - Write detailed PR descriptions
   - Request reviews from relevant team members
   - Address all feedback before merging
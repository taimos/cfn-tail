# cfn-tail

cfn-tail is a node js command line tool to follow the events of a AWS CloudFormation stack.

The region to use is determined by the environment variable `AWS_DEFAULT_REGION`.

## Installation

To install cfn-tail open a terminal and issue: `npm install -g cfn-tail`

## Usage

To follow stack events type `cfn-tail <stackname>` in a shell. 
You have to provide the desired AWS region using the `AWS_DEFAULT_REGION` environment variable.

As a one-liner you can prepend the variable to the command `AWS_DEFAULT_REGION=eu-west-1 cfn-tail <stackname>`.

Logging will stop if the stack creation or update completes or fails.

## Contribute

Feel free to open issues, provide code improvements or updates to the documentation.

## License

The script is licensed under the MIT license and provided as-is.


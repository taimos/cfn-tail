# cfn-tail

cfn-tail is a NodeJS command line tool to follow the events of a AWS CloudFormation stack.

The region to use is determined by the environment variable `AWS_DEFAULT_REGION`.

## Installation

To install cfn-tail open a terminal and issue: `npm install -g cfn-tail`

## Usage

To follow stack events type `cfn-tail <stackname>` in a shell. 

You have to provide the desired AWS region using the `AWS_DEFAULT_REGION` environment variable or using the `--region` option.

```
cfn-tail --region eu-west-1 <stackname>
```

Logging will stop if the stack creation or update completes or fails.

### Optional Arguments

- `--retryMs <number>` specifies the value in milliseconds to use for custom exponential backoff; defaults to `700`. Use this option if you frequently experience API throttling errors.
- `--color <bool>` specifies whether to colorize the output; defaults to `true`

## Contribute

Feel free to open issues, provide code improvements or updates to the documentation.

## License

The script is licensed under the MIT license and provided as-is.

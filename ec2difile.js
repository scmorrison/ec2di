// Ansible EC2 external inventory script settings
//

var ec2 = {

// to talk to a private eucalyptus instance uncomment these lines
// and edit edit eucalyptus_host to be the host name of your cloud controller
//eucalyptus: True
//eucalyptus_host: clc.cloud.domain.org

// AWS regions to make calls to. Set this to 'all' to make request to all regions
// in AWS and merge the results together. Alternatively, set this to a comma
// separated list of regions. E.g. 'us-east-1,us-west-1,us-west-2'

  regions: 'all',
  regions_exclude: [
    'us-gov-west-1',
    'cn-north-1'
  ],

// When generating inventory, Ansible needs to know how to address a server.
// Each EC2 instance has a lot of variables associated with it. Here is the list:
//   http://docs.pythonboto.org/en/latest/ref/ec2.html//module-boto.ec2.instance
// Below are 2 variables that are used as the address of a server:
//   - destination_variable
//   - vpc_destination_variable

// This is the normal destination variable to use. If you are running Ansible
// from outside EC2, then 'public_dns_name' makes the most sense. If you are
// running Ansible from within EC2, then perhaps you want to use the internal
// address, and should set this to 'private_dns_name'.
  destination_variable: 'public_dns_name',

// For server inside a VPC, using DNS names may not make sense. When an instance
// has 'subnet_id' set, this variable is used. If the subnet is public, setting
// this to 'ip_address' will return the public IP address. For instances in a
// private subnet, this should be set to 'private_ip_address', and Ansible must
// be run from with EC2.
  
  vpc_destination_variable: 'ip_address',

// To tag instances on EC2 with the resource records that point to them from
// Route53, uncomment and set 'route53' to True.

  route53: false,

// To exclude RDS instances from the inventory, uncomment and set to false.
//rds: false

// Additionally, you can specify the list of zones to exclude looking up in
// 'route53_excluded_zones' as a comma-separated list.
// route53_excluded_zones: samplezone1.com, samplezone2.com

// By default, only EC2 instances in the 'running' state are returned. Set
// 'all_instances' to True to return all instances regardless of state.

  all_instances: false,

// By default, only RDS instances in the 'available' state are returned.  Set
// 'all_rds_instances' to True return all RDS instances regardless of state.
  all_rds_instances: false,

// API calls to EC2 are slow. For this reason, we cache the results of an API
// call. Set this to the path you want cache files to be written to. Two files
// will be written to this directory:
//   - ansible-ec2.cache
//   - ansible-ec2.index

  cache_path: '~/.ansible/tmp',

// The number of seconds a cache file is considered valid. After this many
// seconds, a new API call will be made, and the cache file will be updated.
// To disable the cache, set this value to 0

  cache_max_age: 300,

// Organize groups into a nested/hierarchy instead of a flat namespace.

  nested_groups: false,

// If you only want to include hosts that match a certain regular expression
// pattern_include: stage-*

// If you want to exclude any hosts that match a certain regular expression
// pattern_exclude: stage-*

// Instance filters can be used to control which instances are retrieved for
// inventory. For the full list of possible filters, please read the EC2 API
// docs: http://docs.aws.amazon.com/AWSEC2/latest/APIReference/ApiReference-query-DescribeInstances.html//query-DescribeInstances-filters

// Filters are key/value pairs separated by '=', to list multiple filters use
// a list separated by commas. See examples below.

// Retrieve only instances with (key=value) env=stage tag
// instance_filters: tag:env=stage

// Retrieve only instances with role=webservers OR role=dbservers tag
// instance_filters: tag:role=webservers,tag:role=dbservers

// Retrieve only t1.micro instances OR instances with tag env=stage
// instance_filters: instance-type=t1.micro,tag:env=stage

// You can use wildcards in filter values also. Below will list instances which
// tag Name value matches webservers1*
// (ex. webservers15, webservers1a, webservers123 etc) 
// instance_filters: tag:Name=webservers1*

};
